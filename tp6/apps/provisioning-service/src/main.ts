import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';
import { Provisioning, ProvisioningSchema } from './provisioning.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://mongo:27017/activation-db?replicaSet=rs0',
    ),
    MongooseModule.forFeature([{ name: Provisioning.name, schema: ProvisioningSchema }]),
  ],
  controllers: [ProvisioningController],
  providers: [ProvisioningService],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      },
      consumer: {
        groupId: 'provisioning-consumer-group',
      },
    },
  });

  await app.listen();
  console.log('⚡ provisioning-service corriendo y escuchando eventos en Kafka');
}

bootstrap();