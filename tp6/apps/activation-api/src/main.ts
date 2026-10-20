import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';
import { ActivationGateway } from './activation.gateway';
import { Activation, ActivationSchema } from './activation.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/activation-db?replicaSet=rs0',
    ),
    MongooseModule.forFeature([{ name: Activation.name, schema: ActivationSchema }]),
  ],
  controllers: [ActivationController],
  providers: [ActivationService, ActivationGateway],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'activation-api-consumer-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
  console.log('🚀 activation-api escuchando en HTTP en el puerto 3000 y consumiendo Kafka');
}

bootstrap();
