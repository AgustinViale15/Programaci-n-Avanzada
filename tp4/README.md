
```markdown
# Payments Microservice - TP4

Microservicio de procesamiento de pagos desarrollado con **NestJS** e integrado con **Stripe Checkout** y **Webhooks**, correspondiente a la cátedra de Programación Avanzada.

---

## 🚀 Requisitos Previos

* **Node.js** (versión 18 o superior)
* **npm**
* **Stripe CLI** (para la captura y prueba local de webhooks)
* Cuenta en **Stripe** en modo de prueba (Test Mode)

---

## 🛠️ Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd tp4

```

2. **Instalar las dependencias:**
```bash
npm install

```


3. **Configurar las variables de entorno:**
* Crear un archivo `.env` en la raíz del proyecto tomando como referencia `.env.template`:
```bash
cp .env.template .env

```


* Completar las claves en el archivo `.env`:
```env
PORT=3003
STRIPE_SECRET=sk_test_...
STRIPE_SUCCESS_URL=http://localhost:3003/payments/success
STRIPE_CANCEL_UR=http://localhost:3003/payments/cancel
STRIPE_ENDPOINT_SECRET=whsec_...

```





---

## ▶️ Ejecución del Microservicio

### 1. Iniciar el servidor NestJS

```bash
npm run start:dev

```

El servicio estará disponible en `http://localhost:3003`.

### 2. Escuchar Webhooks con Stripe CLI

En una terminal paralela dentro del proyecto:

```powershell
.\stripe.exe listen --forward-to localhost:3003/payments/webhook --all-snapshot

```

*(Nota: El secreto de firma `whsec_...` que entrega este comando debe coincidir con el asignado a `STRIPE_ENDPOINT_SECRET` en el archivo `.env`).*

---

## 📡 Endpoints Disponibles

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/payments/create-payment-session` | Inicia una sesión de Stripe Checkout y retorna el `id` y la `url` de pago. |
| `GET` | `/payments/success` | Retorna mensaje de confirmación tras un pago completado exitosamente. |
| `GET` | `/payments/cancel` | Retorna mensaje si el usuario cancela la operación de pago. |
| `POST` | `/payments/webhook` | Endpoint receptor de eventos de Stripe con validación de firma criptográfica (`rawBody`). Procesa `charge.succeeded` y registra el cobro en consola. |

### Formato de carga útil (Body) para `POST /payments/create-payment-session`:

```json
{
  "orderId": "ord-1",
  "currency": "usd",
  "items": [
    {
      "name": "Producto de prueba",
      "price": 20,
      "quantity": 1
    }
  ]
}

```

```

---

