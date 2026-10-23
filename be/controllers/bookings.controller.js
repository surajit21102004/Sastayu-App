const { pool } = require('../config/db');
const liveEvents = require('../services/liveEvents');
const { formatWorkerPhoto } = require('../services/image.helper');
const { processVoiceNote } = require('../services/audio.helper');

/**
 * Create a new service booking
 * POST /api/bookings
 */
async function createBooking(req, res, next) {
  try {
    const {
      serviceTitle,
      serviceType = 'scheduled', // 'scheduled' | 'jaldi' | 'list'
      workerId = null,
      trade = null,
      totalAmount = 200.00,
      proposedPrice = 200.00,
      customerNotes = '',
      issueDetails = '',
      scheduledDate = null,
      scheduledSlot = null,
      voiceNoteUrl = null,
      voiceNoteData = null,
      address = '',
      etaMinutes = null,
      isEmergency = false,
      paymentMode = 'cash',
      paymentMethod = 'cash',
      paymentStatus = 'pending',
      transactionId = null,
    } = req.body;

    const userId = req.user ? req.user.id : 1;
    const bookingNumber = 'SY' + Math.floor(1000 + Math.random() * 9000);
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const dynamicEta = etaMinutes || (isEmergency ? 10 : Math.floor(15 + Math.random() * 20));

    // Process real audio or attach audible voice note
    const effectiveVoiceUrl = processVoiceNote(voiceNoteData || voiceNoteUrl, bookingNumber, req);

    // Derive effective trade category
    let effectiveTrade = trade;
    if (!effectiveTrade && serviceTitle) {
      const lower = serviceTitle.toLowerCase();
      if (lower.includes('plumb')) effectiveTrade = 'Plumber';
      else if (lower.includes('electr') || lower.includes('mcb') || lower.includes('switch') || lower.includes('fan')) effectiveTrade = 'Electrician';
      else if (lower.includes('carpent') || lower.includes('wood') || lower.includes('furniture')) effectiveTrade = 'Carpenter';
      else if (lower.includes('ac ') || lower.includes('air cond')) effectiveTrade = 'AC Repair';
      else if (lower.includes('paint')) effectiveTrade = 'Painter';
      else effectiveTrade = serviceTitle.split('·')[0].trim();
    }

    // NEVER auto-accept: All bookings start as pending until a real worker accepts!
    const assignedWorkerId = workerId ? Number(workerId) : null;
    const initialStatus = 'pending';
    const effectivePaymentMode = (paymentMethod || paymentMode || 'cash').toLowerCase();
    const effectivePaymentStatus = paymentStatus || (effectivePaymentMode === 'cash' ? 'pending' : 'pending');

    const [result] = await pool.execute(
      `INSERT INTO bookings
       (booking_number, user_id, worker_id, service_title, service_type, status, otp, eta_minutes,
        total_amount, visit_charge, repair_charge, customer_notes, address,
        proposed_price, scheduled_date, scheduled_slot, issue_details, voice_note_url, is_emergency, negotiation_status,
        payment_mode, payment_status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingNumber,
        userId,
        assignedWorkerId,
        serviceTitle,
        serviceType,
        initialStatus,
        otp,
        dynamicEta,
        proposedPrice || totalAmount,
        proposedPrice || totalAmount,
        0.00,
        customerNotes || issueDetails,
        address,
        proposedPrice || totalAmount,
        scheduledDate,
        scheduledSlot,
        issueDetails,
        effectiveVoiceUrl,
        Boolean(isEmergency),
        'pending',
        effectivePaymentMode,
        effectivePaymentStatus,
        transactionId || null,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT b.*, w.name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
              w.trade as worker_trade, w.selfie_url as worker_selfie
       FROM bookings b
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    const createdBooking = rows[0];

    // Broadcast LIVE event to workers:
    // If Jaldi Chahiye: sends JALDI_REQUEST for first to accept!
    // If normal booking: sends NEW_BOOKING to assigned worker.
    const eventType = isEmergency ? 'JALDI_REQUEST' : 'NEW_BOOKING';
    liveEvents.broadcast(eventType, {
      bookingId: createdBooking.id,
      bookingNumber: createdBooking.booking_number,
      serviceTitle: createdBooking.service_title,
      serviceType: createdBooking.service_type,
      trade: effectiveTrade,
      workerId: createdBooking.worker_id,
      userId: createdBooking.user_id,
      totalAmount: createdBooking.total_amount,
      proposedPrice: createdBooking.proposed_price,
      customerNotes: createdBooking.customer_notes,
      issueDetails: createdBooking.issue_details,
      scheduledDate: createdBooking.scheduled_date,
      scheduledSlot: createdBooking.scheduled_slot,
      isEmergency: Boolean(createdBooking.is_emergency),
      address: createdBooking.address,
      paymentMode: createdBooking.payment_mode,
      paymentStatus: createdBooking.payment_status,
      transactionId: createdBooking.transaction_id,
      userName: req.user?.name || 'Customer',
      userPhone: req.user?.phone || '8910710493',
      voiceNoteUrl: createdBooking.voice_note_url,
    });

    return res.status(201).json({
      success: true,
      message: isEmergency ? 'Broadcasting Jaldi Chahiye request to nearby partners!' : 'Booking created successfully.',
      booking: createdBooking,
    });
  } catch (err) {
    next(err);
  }
}

const OVERDRAFT_LIMIT = -50;

/**
 * Deduct wallet coins for booking acceptance:
 * - First 2 bookings accepted by technician are 100% FREE.
 * - From 3rd booking onward, 20% of booking amount is deducted as coins.
 * - Allows negative balance down to -50 coins!
 * - If balance drops below -50 coins: BLOCKS ACCEPTANCE.
 */
async function processWorkerBookingAcceptance(workerId, bookingId, bookingAmount, bookingNumber) {
  const [workerRows] = await pool.execute(
    'SELECT id, name, coin_balance, free_bookings_used FROM workers WHERE id = ?',
    [workerId]
  );
  if (workerRows.length === 0) {
    const err = new Error('Worker profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const worker = workerRows[0];
  const freeUsed = Number(worker.free_bookings_used) || 0;
  const currentCoinBalance = Number(worker.coin_balance) || 0;
  const amount = Number(bookingAmount) || 200;

  // Check if booking already had coins deducted
  const [bRows] = await pool.execute('SELECT coins_deducted, is_free_booking FROM bookings WHERE id = ?', [bookingId]);
  if (bRows.length > 0 && (bRows[0].coins_deducted > 0 || bRows[0].is_free_booking)) {
    return {
      alreadyProcessed: true,
      coinsDeducted: bRows[0].coins_deducted || 0,
      isFree: Boolean(bRows[0].is_free_booking),
      coinBalance: currentCoinBalance,
    };
  }

  // 1. First 2 Bookings: FREE
  if (freeUsed < 2) {
    const newFreeUsed = freeUsed + 1;
    await pool.execute(
      'UPDATE workers SET free_bookings_used = ? WHERE id = ?',
      [newFreeUsed, workerId]
    );
    await pool.execute(
      'UPDATE bookings SET is_free_booking = TRUE, coins_deducted = 0 WHERE id = ?',
      [bookingId]
    );
    await pool.execute(
      `INSERT INTO worker_wallet_transactions
       (worker_id, type, coins, balance_after, booking_id, booking_amount, description)
       VALUES (?, 'bonus', 0, ?, ?, ?, ?)`,
      [
        workerId,
        currentCoinBalance,
        bookingId,
        amount,
        `🎁 Free Booking Welcome Offer (#${newFreeUsed} of 2) for order ${bookingNumber || bookingId}`,
      ]
    );

    return {
      isFree: true,
      coinsDeducted: 0,
      coinBalance: currentCoinBalance,
      freeBookingsRemaining: Math.max(0, 2 - newFreeUsed),
    };
  }

  // 2. Token fee: 20% of booking amount as coins
  const coinsRequired = Math.max(1, Math.round(amount * 0.20));
  const newBalance = currentCoinBalance - coinsRequired;

  // Check negative overdraft limit (-50 coins)
  if (newBalance < OVERDRAFT_LIMIT) {
    const error = new Error(
      `Wallet limit reached (-50 coins)! You need ${coinsRequired} Coins (20%) to accept this ₹${amount} booking. Your current balance is ${currentCoinBalance} Coins. Please recharge your wallet with Razorpay.`
    );
    error.insufficientFunds = true;
    error.statusCode = 403;
    error.currentBalance = currentCoinBalance;
    error.coinsRequired = coinsRequired;
    error.overdraftLimit = OVERDRAFT_LIMIT;
    throw error;
  }

  // Deduct coins & record transaction
  await pool.execute('UPDATE workers SET coin_balance = ? WHERE id = ?', [newBalance, workerId]);
  await pool.execute('UPDATE bookings SET is_free_booking = FALSE, coins_deducted = ? WHERE id = ?', [coinsRequired, bookingId]);
  await pool.execute(
    `INSERT INTO worker_wallet_transactions
     (worker_id, type, coins, balance_after, booking_id, booking_amount, description)
     VALUES (?, 'booking_fee', ?, ?, ?, ?, ?)`,
    [
      workerId,
      -coinsRequired,
      newBalance,
      bookingId,
      amount,
      `🪙 Token Fee: ${coinsRequired} Coins (20%) for ₹${amount} booking ${bookingNumber || bookingId}`,
    ]
  );

  liveEvents.broadcast('WALLET_UPDATED', {
    workerId: Number(workerId),
    coinBalance: newBalance,
    deltaCoins: -coinsRequired,
    type: 'booking_fee',
    description: `Deducted ${coinsRequired} Coins (20%) for order ${bookingNumber || bookingId}`,
  });

  return {
    isFree: false,
    coinsDeducted: coinsRequired,
    coinBalance: newBalance,
    freeBookingsRemaining: 0,
  };
}

/**
 * Worker: First to accept Jaldi Chahiye gets the order!
 * POST /api/bookings/:id/accept-jaldi
 */
async function acceptJaldiBooking(req, res, next) {
  try {
    const { id } = req.params;
    const workerId = req.user ? req.user.id : (req.body.workerId ? Number(req.body.workerId) : 1);

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    // If another worker already accepted this Jaldi booking
    if (
      (booking.status === 'accepted' || booking.status === 'in_progress' || booking.status === 'completed') &&
      booking.worker_id &&
      Number(booking.worker_id) !== Number(workerId)
    ) {
      return res.status(409).json({
        success: false,
        alreadyAccepted: true,
        message: 'This Jaldi order has already been accepted by another partner!',
      });
    }

    // Process Wallet Coin Acceptance (First 2 free, then 20% token fee, down to -50 coins limit)
    let walletResult;
    try {
      walletResult = await processWorkerBookingAcceptance(
        workerId,
        id,
        booking.total_amount || booking.proposed_price || 200,
        booking.booking_number
      );
    } catch (wErr) {
      if (wErr.insufficientFunds) {
        return res.status(403).json({
          success: false,
          insufficientFunds: true,
          code: 'INSUFFICIENT_WALLET_BALANCE',
          message: wErr.message,
          currentBalance: wErr.currentBalance,
          coinsRequired: wErr.coinsRequired,
          overdraftLimit: wErr.overdraftLimit,
        });
      }
      throw wErr;
    }

    // Assign this worker and update status to accepted
    await pool.execute(
      `UPDATE bookings
       SET worker_id = ?, status = 'accepted', eta_minutes = 10, negotiation_status = 'accepted'
       WHERE id = ?`,
      [workerId, id]
    );

    const [workerRows] = await pool.execute('SELECT * FROM workers WHERE id = ?', [workerId]);
    const worker = workerRows[0];

    const [updated] = await pool.execute(
      `SELECT b.*, w.name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
              w.trade as worker_trade, w.selfie_url as worker_selfie
       FROM bookings b
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [id]
    );

    // Broadcast JALDI_ACCEPTED to customer and workers
    liveEvents.broadcast('JALDI_ACCEPTED', {
      bookingId: Number(id),
      workerId: Number(workerId),
      userId: booking.user_id,
      workerName: worker?.name || 'Verified Technician',
      workerPhone: worker?.phone || '',
      workerTrade: worker?.custom_trade || worker?.trade || 'Technician',
      workerSelfie: formatWorkerPhoto(worker?.selfie_url, req),
      workerRating: Number(worker?.rating) || 5.0,
      etaMinutes: 10,
    });

    return res.status(200).json({
      success: true,
      message: walletResult.isFree
        ? 'Jaldi Chahiye request accepted FREE! (Welcome offer)'
        : `Jaldi Chahiye request accepted! ${walletResult.coinsDeducted} Coins deducted.`,
      booking: updated[0],
      wallet: walletResult,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Worker: Counter the offered price (e.g. Worker needs ₹50 more)
 * POST /api/bookings/:id/counter-price
 */
async function counterBookingPrice(req, res, next) {
  try {
    const { id } = req.params;
    const { counterPrice, counterNote } = req.body;

    if (!counterPrice || isNaN(Number(counterPrice))) {
      return res.status(400).json({ success: false, message: 'Valid counter price is required.' });
    }

    await pool.execute(
      `UPDATE bookings
       SET counter_price = ?, counter_note = ?, negotiation_status = 'countered'
       WHERE id = ?`,
      [Number(counterPrice), counterNote || 'Worker adjusted service quote.', id]
    );

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const counteredBooking = rows[0];

    // Broadcast LIVE event to customer
    liveEvents.broadcast('PRICE_COUNTERED', {
      bookingId: Number(id),
      workerId: counteredBooking.worker_id,
      userId: counteredBooking.user_id,
      counterPrice: Number(counterPrice),
      counterNote: counterNote || '',
      proposedPrice: counteredBooking.proposed_price,
      serviceTitle: counteredBooking.service_title,
    });

    return res.status(200).json({
      success: true,
      message: `Counter offer of ₹${counterPrice} sent to customer.`,
      booking: counteredBooking,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Worker: Accept Customer's Proposed Price directly
 * POST /api/bookings/:id/accept-price
 */
async function acceptProposedPrice(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];
    const agreedAmount = booking.proposed_price || booking.total_amount || 200;
    const workerId = req.user ? req.user.id : (booking.worker_id || (req.body.workerId ? Number(req.body.workerId) : 1));

    // Process Wallet Coin Acceptance (First 2 free, then 20% token fee, down to -50 coins limit)
    let walletResult;
    try {
      walletResult = await processWorkerBookingAcceptance(
        workerId,
        id,
        agreedAmount,
        booking.booking_number
      );
    } catch (wErr) {
      if (wErr.insufficientFunds) {
        return res.status(403).json({
          success: false,
          insufficientFunds: true,
          code: 'INSUFFICIENT_WALLET_BALANCE',
          message: wErr.message,
          currentBalance: wErr.currentBalance,
          coinsRequired: wErr.coinsRequired,
          overdraftLimit: wErr.overdraftLimit,
        });
      }
      throw wErr;
    }

    await pool.execute(
      `UPDATE bookings
       SET worker_id = ?, total_amount = ?, negotiation_status = 'accepted', status = 'accepted'
       WHERE id = ?`,
      [workerId, agreedAmount, id]
    );

    const [updated] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);

    // Broadcast price accepted
    liveEvents.broadcast('PRICE_ACCEPTED', {
      bookingId: Number(id),
      workerId: updated[0].worker_id,
      userId: updated[0].user_id,
      agreedAmount,
      serviceTitle: updated[0].service_title,
    });

    return res.status(200).json({
      success: true,
      message: walletResult.isFree
        ? 'Offered price accepted FREE! (Welcome offer)'
        : `Offered price accepted! ${walletResult.coinsDeducted} Coins deducted.`,
      booking: updated[0],
      wallet: walletResult,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Customer: Respond to Worker's Counter Offer (Accept or Decline)
 * POST /api/bookings/:id/respond-counter
 */
async function respondToCounter(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'decline'

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    if (action === 'accept') {
      const finalPrice = booking.counter_price || booking.total_amount;
      if (booking.worker_id) {
        try {
          await processWorkerBookingAcceptance(booking.worker_id, id, finalPrice, booking.booking_number);
        } catch (wErr) {
          console.warn('[Wallet accept counter warning]:', wErr.message);
        }
      }

      await pool.execute(
        `UPDATE bookings
         SET total_amount = ?, negotiation_status = 'accepted', status = 'accepted'
         WHERE id = ?`,
        [finalPrice, id]
      );


      const [updated] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);

      // Broadcast counter response to worker
      liveEvents.broadcast('COUNTER_RESPONDED', {
        bookingId: Number(id),
        workerId: booking.worker_id,
        userId: booking.user_id,
        action: 'accept',
        finalPrice,
        serviceTitle: booking.service_title,
      });

      return res.status(200).json({
        success: true,
        message: 'Counter offer accepted! Booking is now confirmed.',
        booking: updated[0],
      });
    } else {
      await pool.execute(
        `UPDATE bookings
         SET negotiation_status = 'rejected', status = 'cancelled'
         WHERE id = ?`,
        [id]
      );

      // Broadcast counter decline to worker
      liveEvents.broadcast('COUNTER_RESPONDED', {
        bookingId: Number(id),
        workerId: booking.worker_id,
        userId: booking.user_id,
        action: 'decline',
        serviceTitle: booking.service_title,
      });

      return res.status(200).json({
        success: true,
        message: 'Counter offer declined. Booking has been cancelled.',
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get all bookings (Customer or Worker)
 * GET /api/bookings?status=upcoming|completed|cancelled
 */
async function getBookings(req, res, next) {
  try {
    const { status, filter, workerId, userId } = req.query;

    let sql = `
      SELECT b.*, w.name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
             w.trade as worker_trade, w.selfie_url as worker_selfie,
             u.name as user_name, u.phone as user_phone
      FROM bookings b
      LEFT JOIN workers w ON b.worker_id = w.id
      LEFT JOIN users u ON b.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    // Role-based filtering: workers see their bookings, customers see their bookings
    if (req.user) {
      if (req.user.type === 'worker') {
        conditions.push('(b.worker_id = ? OR (b.worker_id IS NULL AND b.status = "pending"))');
        params.push(req.user.id);
      } else if (req.user.type === 'customer' && req.user.role !== 'admin') {
        conditions.push('b.user_id = ?');
        params.push(req.user.id);
      }
    } else {
      if (workerId) {
        conditions.push('b.worker_id = ?');
        params.push(workerId);
      }
      if (userId) {
        conditions.push('b.user_id = ?');
        params.push(userId);
      }
    }

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY b.id DESC';

    const [rows] = await pool.execute(sql, params);

    const formattedBookings = rows.map((b) => ({
      ...b,
      worker_selfie: formatWorkerPhoto(b.worker_selfie, req),
    }));

    return res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single booking by ID
 * GET /api/bookings/:id
 */
async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT b.*, w.name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
              w.trade as worker_trade, w.selfie_url as worker_selfie,
              u.name as user_name, u.phone as user_phone
       FROM bookings b
       LEFT JOIN workers w ON b.worker_id = w.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ? OR b.booking_number = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];
    booking.worker_selfie = formatWorkerPhoto(booking.worker_selfie, req);

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update booking status
 * PATCH /api/bookings/:id/status
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, cancelledBy = null, cancelReason = null } = req.body;

    const allowed = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status.' });
    }

    let query = 'UPDATE bookings SET status = ?';
    const params = [status];

    if (status === 'cancelled') {
      const note = cancelReason || (cancelledBy === 'technician' ? 'Declined by technician' : 'Cancelled by customer');
      query += ', counter_note = ?';
      params.push(note);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.execute(query, params);
    const [updated] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const b = updated[0];

    // Broadcast status update
    liveEvents.broadcast('STATUS_UPDATED', {
      bookingId: Number(id),
      workerId: b?.worker_id,
      userId: b?.user_id,
      status,
      cancelledBy: cancelledBy || (status === 'cancelled' ? 'technician' : null),
      cancelReason: cancelReason || b?.counter_note || (status === 'cancelled' ? 'Declined by technician' : null),
      serviceTitle: b?.service_title,
    });

    if (status === 'cancelled') {
      liveEvents.broadcast('BOOKING_CANCELLED', {
        bookingId: Number(id),
        workerId: b?.worker_id,
        userId: b?.user_id,
        cancelledBy: cancelledBy || 'technician',
        cancelReason: cancelReason || b?.counter_note || 'Declined by technician',
        serviceTitle: b?.service_title,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      booking: b,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Worker: Explicitly decline scheduled booking
 * POST /api/bookings/:id/decline
 */
async function declineBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Declined by technician' } = req.body;

    await pool.execute(
      `UPDATE bookings
       SET status = 'cancelled', counter_note = ?
       WHERE id = ?`,
      [reason, id]
    );

    const [updated] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const b = updated[0];

    liveEvents.broadcast('BOOKING_CANCELLED', {
      bookingId: Number(id),
      workerId: b?.worker_id,
      userId: b?.user_id,
      cancelledBy: 'technician',
      cancelReason: reason,
      serviceTitle: b?.service_title,
    });

    liveEvents.broadcast('STATUS_UPDATED', {
      bookingId: Number(id),
      workerId: b?.worker_id,
      userId: b?.user_id,
      status: 'cancelled',
      cancelledBy: 'technician',
      cancelReason: reason,
      serviceTitle: b?.service_title,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking declined by technician.',
      booking: b,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Real-Time Live Sync Endpoint
 * GET /api/bookings/live-sync?since=123456789&userType=worker|customer&workerId=...&userId=...
 */
async function liveSync(req, res, next) {
  try {
    const { since = 0, userType = 'customer', workerId, userId } = req.query;

    const currentUserId = req.user ? req.user.id : (userId ? Number(userId) : null);
    const currentWorkerId = req.user && userType === 'worker' ? req.user.id : (workerId ? Number(workerId) : null);

    // Fetch worker's trade from DB if worker is syncing
    let workerTrade = null;
    if (userType === 'worker' && currentWorkerId) {
      const [wRows] = await pool.execute('SELECT trade, custom_trade FROM workers WHERE id = ?', [currentWorkerId]);
      if (wRows.length > 0) {
        workerTrade = (wRows[0].custom_trade || wRows[0].trade || '').trim().toLowerCase();
      }
    }

    // Get live in-memory events since timestamp
    const events = liveEvents.getEventsSince(since, (e) => {
      if (userType === 'worker') {
        // Direct event for this worker (counter response, status update, or direct booking)
        if (e.payload.workerId && Number(e.payload.workerId) === Number(currentWorkerId)) {
          return true;
        }

        // Jaldi Chahiye Broadcast: ONLY deliver if the booking trade matches this technician's trade!
        if (e.type === 'JALDI_REQUEST') {
          if (!workerTrade) return false;
          const reqTrade = (e.payload.trade || e.payload.serviceTitle || '').toLowerCase();
          return reqTrade.includes(workerTrade) || workerTrade.includes(reqTrade);
        }

        if (e.type === 'NEW_BOOKING' && !e.payload.workerId) {
          if (!workerTrade) return false;
          const reqTrade = (e.payload.trade || e.payload.serviceTitle || '').toLowerCase();
          return reqTrade.includes(workerTrade) || workerTrade.includes(reqTrade);
        }

        if (e.type === 'JALDI_ACCEPTED') {
          return Number(e.payload.workerId) === Number(currentWorkerId);
        }

        return false;
      }
      if (userType === 'customer') {
        return !currentUserId || !e.payload.userId || e.payload.userId === currentUserId;
      }
      return true;
    });

    // Also get latest active incoming booking for worker:
    // Priority 1: Direct pending booking assigned to this worker (Normal booking or Countered)
    // Priority 2: Unassigned emergency broadcast matching THIS worker's trade
    let activeIncoming = null;
    if (userType === 'worker' && currentWorkerId) {
      const [directRows] = await pool.execute(
        `SELECT b.*, u.name as user_name, u.phone as user_phone
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         WHERE b.worker_id = ?
           AND b.status = 'pending'
         ORDER BY b.id DESC LIMIT 1`,
        [currentWorkerId]
      );

      if (directRows.length > 0) {
        activeIncoming = directRows[0];
      } else if (workerTrade) {
        const [broadcastRows] = await pool.execute(
          `SELECT b.*, u.name as user_name, u.phone as user_phone
           FROM bookings b
           LEFT JOIN users u ON b.user_id = u.id
           WHERE b.worker_id IS NULL
             AND b.status = 'pending'
             AND (LOWER(b.service_title) LIKE ? OR LOWER(b.customer_notes) LIKE ?)
           ORDER BY b.id DESC LIMIT 1`,
          [`%${workerTrade}%`, `%${workerTrade}%`]
        );
        if (broadcastRows.length > 0) {
          activeIncoming = broadcastRows[0];
        }
      }
    }

    // Get latest bookings for customer to guarantee real-time sync
    let customerBookings = [];
    if (userType === 'customer' && currentUserId) {
      const [rows] = await pool.execute(
        `SELECT b.*, w.name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
                w.trade as worker_trade, w.selfie_url as worker_selfie
         FROM bookings b
         LEFT JOIN workers w ON b.worker_id = w.id
         WHERE b.user_id = ?
         ORDER BY b.id DESC LIMIT 10`,
        [currentUserId]
      );
      customerBookings = rows.map((b) => ({
        ...b,
        worker_selfie: formatWorkerPhoto(b.worker_selfie, req),
      }));
    }

    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      eventsCount: events.length,
      events,
      activeIncoming,
      customerBookings,
      bookings: customerBookings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Real-Time SSE Stream Endpoint
 * GET /api/bookings/live-stream
 */
function liveStream(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const onEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  liveEvents.on('event', onEvent);

  req.on('close', () => {
    liveEvents.off('event', onEvent);
    res.end();
  });
}

/**
 * Complete a booking with OTP verification
 * POST /api/bookings/:id/complete
 */
async function completeBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { otp, repairCharge = 350.00 } = req.body;

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    // Verify OTP strictly against booking
    if (!otp || String(otp).trim() !== String(booking.otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code from customer.' });
    }

    const totalAmount = Number(booking.visit_charge) + Number(repairCharge);

    await pool.execute(
      `UPDATE bookings
       SET status = 'completed', repair_charge = ?, total_amount = ?
       WHERE id = ?`,
      [repairCharge, totalAmount, id]
    );

    // Record worker earnings with 20% platform fee after first 2 free bookings (Prompt 5)
    if (booking.worker_id) {
      const [priorEarnings] = await pool.execute(
        `SELECT COUNT(*) as completedCount FROM worker_earnings WHERE worker_id = ? AND type = 'job_payout'`,
        [booking.worker_id]
      );
      const orderIndex = (priorEarnings[0]?.completedCount || 0) + 1;

      // First 2 bookings: 0% fee (Company profit = ₹0, Worker gets 100%)
      // Order 3 onwards: 20% fee (e.g. ₹1000 bill => ₹200 company profit, ₹800 worker payout)
      const isFreeTier = orderIndex <= 2;
      const commissionRate = isFreeTier ? 0.00 : 20.00;
      const commissionAmount = isFreeTier ? 0.00 : Number((totalAmount * 0.20).toFixed(2));
      const netAmount = Number((totalAmount - commissionAmount).toFixed(2));

      await pool.execute(
        `INSERT INTO worker_earnings
         (worker_id, booking_id, amount, gross_amount, commission_rate, commission_amount, net_amount, order_index, type, status, payout_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'job_payout', 'credited', 'pending')`,
        [booking.worker_id, booking.id, netAmount, totalAmount, commissionRate, commissionAmount, netAmount, orderIndex]
      );
    }

    liveEvents.broadcast('JOB_COMPLETED', {
      bookingId: Number(id),
      workerId: booking.worker_id,
      userId: booking.user_id,
      totalAmount,
    });

    return res.status(200).json({
      success: true,
      message: 'Job completed successfully and payment settled.',
      totalAmount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit Review & Rating for a completed booking
 * POST /api/bookings/:id/rate
 */
async function rateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { rating = 5, tags = [], comment = '' } = req.body;
    const userId = req.user ? req.user.id : 1;

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];
    const workerId = booking.worker_id;

    const tagsStr = Array.isArray(tags) ? tags.join(', ') : String(tags || '');
    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

    await pool.execute(
      `INSERT INTO reviews (booking_id, user_id, worker_id, rating, tags, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, workerId, numRating, tagsStr, comment]
    );

    // Update booking record to persist that rating is completed
    await pool.execute(
      `UPDATE bookings
       SET is_rated = TRUE, user_rating = ?, review_comment = ?, review_tags = ?
       WHERE id = ?`,
      [numRating, comment, tagsStr, id]
    );

    // Update worker rating and total jobs
    if (workerId) {
      await pool.execute(
        `UPDATE workers
         SET rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE worker_id = ?),
             total_jobs = total_jobs + 1
         WHERE id = ?`,
        [workerId, workerId]
      );
    }

    liveEvents.broadcast('BOOKING_RATED', {
      bookingId: Number(id),
      userId,
      workerId,
      rating: numRating,
    });

    return res.status(201).json({
      success: true,
      message: 'Rating and review submitted successfully. Thank you!',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirm Payment (UPI or Cash)
 * POST /api/bookings/:id/pay
 */
async function confirmPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { paymentMode = 'upi', amount, transactionId } = req.body;

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];
    const finalAmount = Number(amount) || Number(booking.total_amount) || 500.00;
    const txId = transactionId || (paymentMode === 'upi' ? `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}` : `CASH_${Date.now()}`);

    await pool.execute(
      `UPDATE bookings
       SET payment_mode = ?, payment_status = 'paid', transaction_id = ?
       WHERE id = ?`,
      [paymentMode, txId, id]
    );

    const [updated] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);

    // Broadcast LIVE event so worker and customer screens update instantly
    liveEvents.broadcast('PAYMENT_CONFIRMED', {
      bookingId: Number(id),
      workerId: booking.worker_id,
      userId: booking.user_id,
      paymentMode,
      paymentStatus: 'paid',
      amount: finalAmount,
      transactionId: txId,
    });

    return res.status(200).json({
      success: true,
      message: paymentMode === 'upi' ? 'UPI payment confirmed successfully! Thank you.' : 'Cash payment recorded. Please hand cash to the technician.',
      booking: updated[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  declineBooking,
  completeBooking,
  counterBookingPrice,
  acceptProposedPrice,
  respondToCounter,
  liveSync,
  liveStream,
  rateBooking,
  confirmPayment,
  acceptJaldiBooking,
};
