import amqp from "amqplib";
import { logger } from "./logger.js";
import dotenv from "dotenv";
dotenv.config();

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

export const connectToRabbitMq = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbit mq");
    return channel;
  } catch (error) {
    logger.error("Error while connecting to rabbit mq", error);
  }
};

export const publishEvent = async (routingKey, message) => {
  if (!channel) {
    await connectToRabbitMq();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`)
};
