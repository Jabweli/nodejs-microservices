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


export const consumeEvent = async (routingKey, callback) => {
  if (!channel) {
    await connectToRabbitMq();
  }

  const q = await channel.assertQueue("", {exclusive:true});
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg) => {
    if(msg!==null){
      const content = JSON.parse(msg.content.toString())
      callback(content)
      channel.ack(msg)
    }
  })
  logger.info(`Subscribed to event: ${routingKey}`)
};
