import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';

import { logger } from '../utils/logger.utils';

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'order-service';
const groupId = process.env.KAFKA_GROUP_ID || 'order-service-group';

export const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

let producer: Producer | null = null;
let consumer: Consumer | null = null;

// Topics
export const TOPICS = {
  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  ORDER_FAILED: 'order.failed',
  
  // Payment Events
  PAYMENT_REQUESTED: 'payment.requested',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Inventory Events
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  INVENTORY_FAILED: 'inventory.failed',
  
  // Shipping Events
  SHIPPING_REQUESTED: 'shipping.requested',
  SHIPPING_CONFIRMED: 'shipping.confirmed',
  SHIPPING_DISPATCHED: 'shipping.dispatched',
  SHIPPING_DELIVERED: 'shipping.delivered',
  
  // Notification Events
  NOTIFICATION_REQUESTED: 'notification.requested',
  
  // Dead Letter Queue
  DLQ: 'dead-letter-queue',
};

export const getProducer = async (): Promise<Producer> => {
  if (producer) {
    return producer;
  }

  producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
  });

  await producer.connect();
  logger.info('✅ Kafka producer connected');
  
  return producer;
};

export const getConsumer = async (): Promise<Consumer> => {
  if (consumer) {
    return consumer;
  }

  consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  logger.info('✅ Kafka consumer connected');
  
  return consumer;
};

export const publishEvent = async (topic: string, message: any): Promise<void> => {
  try {
    const prod = await getProducer();
    
    const key = message.aggregateId || message.orderId || 'unknown';
    const correlationId = message.correlationId || message.aggregateId || message.orderId || 'unknown';
    
    const messageData = {
      key,
      value: JSON.stringify(message),
      timestamp: Date.now().toString(),
      headers: {
        eventType: message.eventType || topic,
        correlationId,
      },
    };

    await prod.send({
      topic,
      messages: [messageData],
    });

    logger.debug(`Event published to ${topic}:`, message);
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}:`, error);
    throw error;
  }
};

export const subscribeToTopics = async (
  topics: string[],
  messageHandler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> => {
  const cons = await getConsumer();

  await cons.subscribe({
    topics,
    fromBeginning: false,
  });

  await cons.run({
    eachMessage: async (payload) => {
      const { topic, partition, message } = payload;
      
      logger.debug(`Received message from ${topic} [${partition}]`);
      
      try {
        await messageHandler(payload);
      } catch (error) {
        logger.error(`Error processing message from ${topic}:`, error);
        // Send to DLQ
        await sendToDeadLetterQueue(payload, error as Error);
      }
    },
  });

  logger.info(`✅ Subscribed to topics: ${topics.join(', ')}`);
};

export const sendToDeadLetterQueue = async (
  payload: EachMessagePayload,
  error: Error
): Promise<void> => {
  try {
    const dlqMessage = {
      originalTopic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      key: payload.message.key?.toString(),
      value: payload.message.value?.toString(),
      headers: payload.message.headers,
      error: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    };

    await publishEvent(TOPICS.DLQ, dlqMessage);
    logger.warn(`Message sent to DLQ from topic: ${payload.topic}`);
  } catch (dlqError) {
    logger.error('Failed to send message to DLQ:', dlqError);
  }
};

export const disconnectKafka = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
  
  if (consumer) {
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  }
};

export const createTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  
  try {
    await admin.connect();
    
    const topicList = Object.values(TOPICS).map(topic => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1,
    }));

    await admin.createTopics({
      topics: topicList,
      waitForLeaders: true,
    });

    logger.info('✅ Kafka topics created');
  } catch (error: any) {
    if (error.type !== 'TOPIC_ALREADY_EXISTS') {
      logger.error('Failed to create Kafka topics:', error);
    }
  } finally {
    await admin.disconnect();
  }
};
