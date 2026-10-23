const EventEmitter = require('events');

class LiveEventManager extends EventEmitter {
  constructor() {
    super();
    this.recentEvents = [];
    this.maxEvents = 100;
  }

  broadcast(eventType, payload) {
    const event = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.pop();
    }

    this.emit('event', event);
    return event;
  }

  getEventsSince(sinceTimestamp, filterFn) {
    const since = Number(sinceTimestamp) || 0;
    const matched = this.recentEvents.filter((e) => e.timestamp > since);
    return filterFn ? matched.filter(filterFn) : matched;
  }

  clear() {
    this.recentEvents = [];
  }
}

const liveEvents = new LiveEventManager();

module.exports = liveEvents;
