const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/', optionalAuth, bookingsController.createBooking);
router.get('/', optionalAuth, bookingsController.getBookings);
router.get('/live-sync', optionalAuth, bookingsController.liveSync);
router.get('/live-stream', bookingsController.liveStream);
router.get('/:id', optionalAuth, bookingsController.getBookingById);
router.patch('/:id/status', optionalAuth, bookingsController.updateBookingStatus);
router.post('/:id/decline', optionalAuth, bookingsController.declineBooking);
router.post('/:id/complete', optionalAuth, bookingsController.completeBooking);
router.post('/:id/counter-price', optionalAuth, bookingsController.counterBookingPrice);
router.post('/:id/accept-price', optionalAuth, bookingsController.acceptProposedPrice);
router.post('/:id/respond-counter', optionalAuth, bookingsController.respondToCounter);
router.post('/:id/rate', optionalAuth, bookingsController.rateBooking);
router.post('/:id/pay', optionalAuth, bookingsController.confirmPayment);
router.post('/:id/accept-jaldi', optionalAuth, bookingsController.acceptJaldiBooking);

module.exports = router;
