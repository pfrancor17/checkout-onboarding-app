# Infraestructura (AWS) — Terraform

Toda la infraestructura está definida como código en esta carpeta.

```
          https://xxxx.cloudfront.net
                     │
              ┌──────┴──────┐
              │ CloudFront  │  HTTPS, un solo dominio
              └──┬───────┬──┘
           /*    │       │  /api/*   (sin caché; pasa Idempotency-Key, etc.)
        ┌────────┴─┐  ┌──┴──────────────────────────┐
        │ S3       │  │ Lightsail Container Service │──► Pasarela de pagos (sandbox)
        │ privado  │  │ NestJS (Docker, HTTPS)       │
        │ React    │  └──┬──────────────────────────┘
        └──────────┘     │ misma Región, red de Lightsail
                    ┌────┴────────────────────────────┐
                    │ Lightsail PostgreSQL 16 (privado)│
                    └─────────────────────────────────┘
```

| Recurso | Archivo | Detalle |
|---|---|---|
| Base de datos | `database.tf` | PostgreSQL 16 administrado, privado, contraseña aleatoria, backups |
| API | `api.tf` | Contenedor `nano`, health check en `/api/health`, variables de entorno |
| Frontend + CDN | `frontend.tf` | S3 privado con Origin Access Control, CloudFront con `/api/*` hacia el contenedor y cabeceras de seguridad |

## ¿Por qué Lightsail y Terraform?

La cuenta nueva quedó con una política de la organización (SCP) que bloquea CloudFormation (y por lo tanto CDK), EC2, RDS, Lambda, ECR y SSM. Por eso se eligieron Lightsail, S3 y CloudFront con Terraform, que llama directamente a las APIs de AWS sin pasar por CloudFormation.

> **Estado:** la misma política también terminó negando la creación de recursos en S3 y Lightsail, incluso después de pasar la cuenta al plan de pago, así que la app se publicó en Render ([`render.yaml`](../render.yaml)). Este código queda listo y validado en CI: con una cuenta sin esa restricción se despliega con `./infra/scripts/deploy.sh`.

- **Un solo dominio HTTPS:** CloudFront sirve el frontend y reenvía `/api/*` al contenedor. El navegador no necesita CORS ni hay que comprar un dominio.
- **Base de datos privada:** solo los recursos de Lightsail de la misma Región (la API) llegan a ella.
- **Secretos fuera del repo:** las llaves de la pasarela se leen de `backend/.env` al desplegar y viajan como variables `TF_VAR_*`. El estado de Terraform (que contiene secretos) está en `.gitignore`.
- **Arranque idempotente:** el contenedor aplica migraciones y el seed antes de levantar la API. Redeplegar nunca duplica datos ni reinicia el stock.

## Requisitos (una sola vez)

```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
brew install aws/tap/lightsailctl
aws configure          # usuario IAM, región us-east-1
```

Además: Docker corriendo y `backend/.env` con las llaves del sandbox.

## Desplegar

```bash
./infra/scripts/deploy.sh
```

1. Crea la infraestructura (Terraform muestra el plan y pide `yes`). La primera vez tarda unos 15 minutos, sobre todo la base de datos.
2. Construye la imagen del backend (`linux/amd64`) y la sube al servicio de contenedores.
3. Despliega la imagen (Terraform pide `yes` otra vez).
4. Construye el frontend con `VITE_API_URL=/api`, lo sube a S3 e invalida la caché.
5. Espera a que `GET /api/health` responda y muestra las URLs.

Para actualizar después de un cambio, se corre el mismo script.

## Destruir (al terminar la evaluación)

```bash
./infra/scripts/destroy.sh
```

## Costo estimado

Contenedor `nano` ~US$ 7/mes + PostgreSQL `micro` ~US$ 15/mes + S3/CloudFront (céntimos).

## Webhook de la pasarela

El endpoint queda publicado en `https://<app>/api/webhooks/payment-events` (output `webhook_url`). La cuenta sandbox del reto es compartida y pide no modificarla, así que no se registra en su panel. El endpoint está probado con eventos firmados.
