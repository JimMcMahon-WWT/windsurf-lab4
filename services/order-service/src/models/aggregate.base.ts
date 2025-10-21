import { DomainEvent } from '../events/base.event';
import { eventStore } from '../events/event-store';
import { eventPublisher } from '../events/event-publisher';
import { logger } from '../utils/logger.utils';

/**
 * Base Aggregate for Event Sourcing
 * All aggregates should extend this class
 */
export abstract class AggregateRoot {
  protected id: string;
  protected version: number;
  protected uncommittedEvents: DomainEvent[];

  constructor(id: string) {
    this.id = id;
    this.version = 0;
    this.uncommittedEvents = [];
  }

  /**
   * Get the aggregate ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Mark all events as committed
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Load the aggregate from event history
   */
  async loadFromHistory(aggregateId: string): Promise<void> {
    this.id = aggregateId;

    // Try to load from snapshot first
    const snapshot = await eventStore.getSnapshot(aggregateId);
    let fromVersion = 0;

    if (snapshot) {
      this.applySnapshot(snapshot.snapshot_data);
      this.version = snapshot.snapshot_version;
      fromVersion = snapshot.snapshot_version;
      logger.debug(`Loaded snapshot for ${aggregateId} at version ${fromVersion}`);
    }

    // Load events after snapshot
    const events = await eventStore.getEvents(aggregateId, fromVersion);
    
    for (const event of events) {
      this.applyEvent(event, false);
      this.version = event.eventVersion;
    }

    logger.debug(`Loaded ${events.length} events for ${aggregateId}, current version: ${this.version}`);
  }

  /**
   * Apply an event to the aggregate
   * @param event - The event to apply
   * @param isNew - Whether this is a new event (not from history)
   */
  protected applyEvent(event: DomainEvent, isNew: boolean = true): void {
    // Call the event handler method
    const handlerName = `on${event.eventType}`;
    
    if (typeof (this as any)[handlerName] === 'function') {
      (this as any)[handlerName](event);
    } else {
      logger.warn(`No handler found for event type: ${event.eventType}`);
    }

    if (isNew) {
      this.uncommittedEvents.push(event);
    }
  }

  /**
   * Raise a new domain event
   */
  protected raiseEvent(event: DomainEvent): void {
    event.eventVersion = this.version + this.uncommittedEvents.length + 1;
    this.applyEvent(event, true);
  }

  /**
   * Save the aggregate (persist events and publish)
   */
  async save(): Promise<void> {
    if (this.uncommittedEvents.length === 0) {
      logger.debug('No uncommitted events to save');
      return;
    }

    try {
      // Persist events to event store
      await eventStore.appendEvents(this.uncommittedEvents);

      // Update version
      this.version += this.uncommittedEvents.length;

      // Publish events
      await eventPublisher.publishBatch(this.uncommittedEvents);

      // Check if we should create a snapshot
      await this.createSnapshotIfNeeded();

      // Clear uncommitted events
      this.markEventsAsCommitted();

      logger.debug(`Saved ${this.uncommittedEvents.length} events for aggregate ${this.id}`);
    } catch (error) {
      logger.error('Failed to save aggregate:', error);
      throw error;
    }
  }

  /**
   * Create a snapshot if threshold is reached
   */
  protected async createSnapshotIfNeeded(): Promise<void> {
    const snapshotFrequency = parseInt(process.env.SNAPSHOT_FREQUENCY || '10');
    
    if (this.version % snapshotFrequency === 0) {
      const snapshotData = this.createSnapshot();
      await eventStore.saveSnapshot({
        aggregate_id: this.id,
        aggregate_type: this.getAggregateType(),
        snapshot_version: this.version,
        snapshot_data: snapshotData,
        created_at: new Date(),
      });
      logger.debug(`Created snapshot for ${this.id} at version ${this.version}`);
    }
  }

  /**
   * Create a snapshot of the current state
   * Must be implemented by derived classes
   */
  protected abstract createSnapshot(): any;

  /**
   * Apply a snapshot to restore state
   * Must be implemented by derived classes
   */
  protected abstract applySnapshot(snapshotData: any): void;

  /**
   * Get the aggregate type name
   * Must be implemented by derived classes
   */
  protected abstract getAggregateType(): string;

  /**
   * Validate aggregate state
   * Can be overridden by derived classes
   */
  protected validateState(): void {
    // Override in derived classes
  }
}
