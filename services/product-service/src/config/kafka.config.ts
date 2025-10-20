import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { logger } from '../utils/logger.utils';

const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'product-service';
const groupId = process.env.KAFKA_GROUP_ID || 'product-service-group';

// Topics
export const TOPICS = {
  INVENTORY: process.env.KAFKA_TOPIC_INVENTORY || 'inventory-events',
  PRODUCTS: process.env.KAFKA_TOPIC_PRODUCTS || 'product-events',
};

// Create Kafka instance
const kafka = kafkaEnabled ? new Kafka({
  clientId,
  brokers,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
}) : null;

// Create producer
let producer: Producer | null = null;

export const createProducer = async (): Promise<Producer | null> => {
  if (!kafkaEnabled || !kafka) {
    logger.info('Kafka is disabled');
    return null;
  }

  try {
    producer = kafka.producer();
    await producer.connect();
    logger.info('✅ Kafka producer connected');
    return producer;
  } catch (error) {
    logger.error('❌ Error connecting Kafka producer:', error);
    return null;
  }
};

// Publish event
export const publishEvent = async (
  topic: string,
  key: string,
  value: any
): Promise<void> => {
  if (!kafkaEnabled || !producer) {
    logger.debug('Kafka disabled, event not published:', { topic, key });
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.debug('Published event to Kafka:', { topic, key });
  } catch (error) {
    logger.error('Error publishing event to Kafka:', error);
    // Don't throw - we don't want to fail the main operation if event publishing fails
  }
};

// Publish inventory event
export const publishInventoryEvent = async (
  eventType: string,
  data: any
): Promise<void> => {
  await publishEvent(TOPICS.INVENTORY, data.product_id || data.variant_id, {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

// Publish product event
export const publishProductEvent = async (
  eventType: string,
  data: any
): Promise<void> => {
  await publishEvent(TOPICS.PRODUCTS, data.product_id || data.id, {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

// Create consumer (for listening to events from other services)
export const createConsumer = async (
  topics: string[]
): Promise<Consumer | null> => {
  if (!kafkaEnabled || !kafka) {
    return null;
  }

  try {
    const consumer = kafka.consumer({ groupId });
    await consumer.connect();
    
    await consumer.subscribe({
      topics,
      fromBeginning: false,
    });
    
    logger.info('✅ Kafka consumer connected and subscribed to:', topics);
    return consumer;
  } catch (error) {
    logger.error('❌ Error connecting Kafka consumer:', error);
    return null;
  }
};

// Run consumer with message handler
export const runConsumer = async (
  consumer: Consumer,
  messageHandler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> => {
  await consumer.run({
    eachMessage: async (payload) => {
      try {
        await messageHandler(payload);
      } catch (error) {
        logger.error('Error processing Kafka message:', error);
      }
    },
  });
};

// Graceful shutdown
export const closeKafka = async (): Promise<void> => {
  if (!kafkaEnabled) {
    return;
  }

  try {
    if (producer) {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
    }
  } catch (error) {
    logger.error('Error closing Kafka connection:', error);
  }
};
