#!/bin/bash

echo "Esperando que Kafka esté listo..."
until /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list > /dev/null 2>&1; do
  sleep 2
done

echo "Kafka listo. Creando topics con 3 particiones..."

TOPICS=(
  "activation.requested"
  "activation.requested.dlq"
  "billing.events"
  "billing.events.dlq"
  "provisioning.events"
  "provisioning.events.dlq"
  "activation.events"
  "activation.events.dlq"
)

for topic in "${TOPICS[@]}"; do
  /opt/kafka/bin/kafka-topics.sh --create --if-not-exists \
    --bootstrap-server kafka:9092 \
    --partitions 3 \
    --replication-factor 1 \
    --topic "$topic"
done

echo "Todos los topics fueron creados con éxito."