# Checkout Onboarding App

App de compra de un producto con pago por tarjeta de crédito (pasarela en modo sandbox): página de producto → datos de tarjeta y entrega → resumen → resultado → producto con el stock actualizado.

- **Frontend:** React + TypeScript + Redux Toolkit (SPA, mobile first) — [`frontend/`](frontend/)
- **Backend:** NestJS + TypeScript, arquitectura hexagonal y Railway Oriented Programming, PostgreSQL — [`backend/`](backend/)

> La documentación completa (arquitectura, modelo de datos, API y despliegue) se completa en el paso final del proyecto.

## Tests y cobertura

Todos los tests están escritos con **Jest**. El reto pide más de 80 % de cobertura en frontend y backend; el CI (GitHub Actions) falla si cualquiera de los dos baja de ese umbral.

### Frontend

| Métrica | Cobertura |
|---|---|
| Statements | **100 %** (572/572) |
| Branches | **100 %** (330/330) |
| Functions | **100 %** (174/174) |
| Lines | **100 %** (490/490) |

190 tests en 21 suites: reducers y thunks de Redux, validaciones de tarjeta y entrega, componentes con Testing Library (interacción real del usuario: escribir, hacer clic, recargar el estado) y el cliente HTTP.

### Backend

| Métrica | Cobertura |
|---|---|
| Statements | **100 %** (793/793) |
| Branches | **86,64 %** (266/307) |
| Functions | **100 %** (173/173) |
| Lines | **100 %** (686/686) |

| Suite | Tests | Qué prueba |
|---|---|---|
| Unitarios | 175 en 31 suites | Dominio, casos de uso (ROP), adaptadores, controllers, DTOs y mapeo ORM |
| E2E | 21 en 4 suites | Endpoints HTTP reales con supertest: códigos de estado y validación de los bodies |
| Integración | 7 en 1 suite | El repositorio contra **PostgreSQL real**: reserva atómica de stock con pedidos concurrentes, liquidación única, idempotencia |

**Sobre las ramas del backend (86,64 %):** las 41 ramas sin cubrir no son lógica de la aplicación. Son las que TypeScript genera al compilar los decoradores de NestJS y TypeORM (`emitDecoratorMetadata`), del tipo `typeof X !== "undefined" ? X : Object`, una por cada parámetro o propiedad decorada. No se ejecutan nunca en tiempo de ejecución, por eso no se pueden cubrir con tests. Toda la lógica escrita a mano está cubierta al 100 %.

### Cómo correrlos

```bash
# Frontend
cd frontend
npm test                # tests
npm run test:cov        # con reporte de cobertura

# Backend
cd backend
npm test                # unitarios
npm run test:cov        # unitarios con reporte de cobertura
npm run test:e2e        # endpoints HTTP
docker compose up -d    # (desde la raíz) PostgreSQL para la integración
npm run test:int        # repositorio contra PostgreSQL
```
