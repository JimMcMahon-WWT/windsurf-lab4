import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database.config';
import { publishEvent, TOPICS } from '../config/kafka.config';
import { logger } from '../utils/logger.utils';

import { DomainEvent } from './base.event';

/**
 * Event Publisher with Outbox Pattern
 * Ensures reliable event publishing with transactional guarantees
 */
export class EventPublisher {
  /**
   * Publish a single event to Kafka
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      const topic = this.getTopicForEvent(event.eventType);
      await publishEvent(topic, {
        ...event,
        timestamp: event.timestamp.toISOString(),
      });

      logger.debug(`Event published: ${event.eventType}`);
    } catch (error) {
      logger.error(`Failed to publish event ${event.eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    const publishPromises = events.map((event) => this.publish(event));
    await Promise.all(publishPromises);
  }

  /**
   * Store event in outbox for later publishing (Outbox Pattern)
   * Used for transactional event publishing
   */
  async storeInOutbox(event: DomainEvent): Promise<void> {
    await pool.query(
      `INSERT INTO outbox 
       (id, aggregate_id, aggregate_type, event_type, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        event.aggregateId,
        event.aggregateType,
        event.eventType,
        {
          ...event,
          timestamp: event.timestamp.toISOString(),
        },
      ]
    );
  }

  /**
   * Process outbox - publish pending events
   * Should be run periodically by a background job
   */
  async processOutbox(batchSize: number = 100): Promise<number> {
    const client = await pool.connect();
    let processedCount = 0;

    try {
      // Get unpublished events
      const result = await client.query(
        `SELECT * FROM outbox 
         WHERE published = FALSE 
         ORDER BY created_at ASC 
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );

      for (const row of result.rows) {
        try {
          const topic = this.getTopicForEvent(row.event_type);
          await publishEvent(topic, row.payload);

          // Mark as published
          await client.query(
            'UPDATE outbox SET published = TRUE, published_at = NOW() WHERE id = $1',
            [row.id]
          );

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process outbox event ${row.id}:`, error);

          // Increment retry count
          await client.query('UPDATE outbox SET retry_count = retry_count + 1 WHERE id = $1', [
            row.id,
          ]);
        }
      }

      // Clean up old published events (older than 7 days)
      await client.query(
        `DELETE FROM outbox 
         WHERE published = TRUE 
         AND published_at < NOW() - INTERVAL '7 days'`
      );

      logger.info(`Processed ${processedCount} outbox events`);
      return processedCount;
    } finally {
      client.release();
    }
  }

  /**
   * Map event type to Kafka topic
   */
  private getTopicForEvent(eventType: string): string {
    const topicMap: Record<string, string> = {
      OrderCreated: TOPICS.ORDER_CREATED,
      OrderConfirmed: TOPICS.ORDER_CONFIRMED,
      OrderCancelled: TOPICS.ORDER_CANCELLED,
      OrderCompleted: TOPICS.ORDER_COMPLETED,
      OrderFailed: TOPICS.ORDER_FAILED,
      PaymentProcessed: TOPICS.PAYMENT_SUCCEEDED,
      PaymentFailed: TOPICS.PAYMENT_FAILED,
      InventoryReserved: TOPICS.INVENTORY_RESERVED,
      InventoryReleased: TOPICS.INVENTORY_RELEASED,
      OrderShipped: TOPICS.SHIPPING_DISPATCHED,
      OrderDelivered: TOPICS.SHIPPING_DELIVERED,
    };

    return topicMap[eventType] || TOPICS.ORDER_CREATED;
  }
}

export const eventPublisher = new EventPublisher();

/**
 * Background job to process outbox
 * Run this periodically (e.g., every 5 seconds)
 */
export const startOutboxProcessor = (): void => {
  const INTERVAL_MS = 5000;

  setInterval(async () => {
    try {
      await eventPublisher.processOutbox();
    } catch (error) {
      logger.error('Outbox processor error:', error);
    }
  }, INTERVAL_MS);

  logger.info('Outbox processor started');
};
