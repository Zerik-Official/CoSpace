<h1 align="center">
  CoSpace
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-111111?style=for-the-badge&logo=nextdotjs">
  <img src="https://img.shields.io/badge/React-111111?style=for-the-badge&logo=react">
  <img src="https://img.shields.io/badge/TypeScript-111111?style=for-the-badge&logo=typescript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-111111?style=for-the-badge&logo=tailwindcss">
  <img src="https://img.shields.io/badge/Prisma-111111?style=for-the-badge&logo=prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-111111?style=for-the-badge&logo=postgresql">
  <img src="https://img.shields.io/badge/Supabase-111111?style=for-the-badge&logo=supabase">
  <img src="https://img.shields.io/badge/Docker-111111?style=for-the-badge&logo=docker">
  <img src="https://img.shields.io/badge/Vercel-111111?style=for-the-badge&logo=vercel">
  <img src="https://img.shields.io/badge/Bun-111111?style=for-the-badge&logo=bun">
</p>

<p align="center">
  <img src=".github/preview.png" alt="Vista previa de CoSpace"/>
</p>

<p align="center">
  <strong>Español</strong> | <a href="./README.md">English</a>
</p>

CoSpace es una aplicación web full-stack para reservar espacios de coworking por horas. Incluye catálogo público, disponibilidad por día, autenticación segura con access y refresh tokens, panel de reservas del usuario y panel de administración de espacios, reservas y cancelaciones.

## Stack

- Next.js 16 con App Router, React 19 y TypeScript.
- Tailwind CSS 4 con componentes de interfaz reutilizables.
- Prisma 7 con PostgreSQL y el driver adapter `@prisma/adapter-pg`.
- Supabase como base de datos PostgreSQL gestionada en producción.
- `next-intl` para español e inglés.
- Access tokens JWT HS256 y refresh tokens opacos almacenados como hashes SHA-256.
- Vitest para las pruebas de reglas de negocio.
- Imagen Docker multi-stage y GitHub Actions para integración continua.

## Requisitos

- Node.js 20.9 o superior.
- Bun 1.4.4. El repositorio fija esta versión en `packageManager`.
- PostgreSQL 16 o un proyecto de Supabase.
- Docker y Docker Compose solo si se usa el flujo con contenedores.

## Configuración del entorno

1. Instala las dependencias:

   ```bash
   bun install
   ```

2. Crea el archivo de entorno:

   ```bash
   cp .env.example .env
   ```

3. Completa las variables:

   | Variable | Obligatoria | Descripción |
   | --- | --- | --- |
   | `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL. En Supabase usa la URI del Session pooler. |
   | `JWT_ACCESS_SECRET` | Sí | Secreto de al menos 32 caracteres para firmar access tokens. |
   | `JWT_REFRESH_SECRET` | Sí | Secreto de al menos 32 caracteres reservado para material de refresh tokens. |
   | `ACCESS_TOKEN_EXPIRES_IN` | No | Duración del access token. Por defecto `15m`. |
   | `REFRESH_TOKEN_EXPIRES_IN` | No | Duración del refresh token. Por defecto `7d`. |
   | `NEXT_PUBLIC_APP_URL` | No | URL pública de la aplicación. Por defecto `http://localhost:3000`. |
   | `NEXT_PUBLIC_VENUE_TIMEZONE` | No | Zona horaria del local. Por defecto `America/Bogota`. |
   | `NEXT_PUBLIC_VENUE_CURRENCY` | No | Moneda ISO-4217. Por defecto `COP`. |
   | `SEED_ADMIN_EMAIL` | No | Correo del administrador creado por el seed. |
   | `SEED_ADMIN_PASSWORD` | No | Contraseña del administrador creado por el seed. |
   | `SEED_ADMIN_NAME` | No | Nombre visible del administrador creado por el seed. |

4. Genera los secretos:

   ```bash
   openssl rand -hex 32
   ```

5. Genera el cliente de Prisma. Es necesario en un clon limpio porque `server/db/generated` está ignorado por Git:

   ```bash
   bun run db:generate
   ```

6. Aplica las migraciones y carga el catálogo inicial:

   ```bash
   bun run db:migrate
   bun run db:seed
   ```

7. Inicia el servidor de desarrollo:

   ```bash
   bun run dev
   ```

La aplicación queda disponible en `http://localhost:3000`.

## Cuenta de administración

El seed crea un administrador con estos valores por defecto:

- Correo: `admin@cospace.dev`
- Contraseña: `Admin1234!`
- Nombre: `Ada Restrepo`

Se pueden cambiar con `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y `SEED_ADMIN_NAME` antes de ejecutar `bun run db:seed`. El seed es idempotente: volver a ejecutarlo actualiza la contraseña del administrador con el valor del entorno.

El seed también carga ocho espacios de ejemplo: cuatro escritorios, dos salas de reunión y dos cabinas.

## Reglas de negocio

- Las reservas empiezan y terminan en horas completas del reloj del local.
- La duración mínima es una hora y la máxima es cuatro horas.
- El horario de atención es de 07:00 a 21:00. Una reserva no puede terminar después de las 21:00 ni cruzar la medianoche.
- Un espacio no puede tener dos reservas confirmadas que se solapen.
- Un usuario no puede tener dos reservas confirmadas que se solapen, incluso en espacios distintos.
- Cada usuario puede tener como máximo tres reservas futuras confirmadas.
- No se puede reservar un espacio desactivado.
- No se puede reservar con más de treinta días de anticipación ni en el pasado.
- Solo el propietario o un administrador pueden cancelar una reserva.
- El propietario necesita al menos dos horas de antelación para cancelar. Un administrador puede cancelar sin ese aviso.
- Cancelar solo cambia el estado de la reserva; nunca borra la fila ni libera el historial.
- El precio siempre se calcula en el servidor con el precio por hora vigente del espacio.
- Los espacios no se eliminan: se desactivan. No se puede desactivar un espacio con reservas confirmadas que aún no hayan terminado.
- La cabecera `Idempotency-Key` hace repetible la creación de una reserva y solo puede reutilizarse dentro de la cuenta que la creó.

Las reglas de reserva viven en `server/domain/reservation-policy.ts` y las de ciclo de vida de los espacios en `server/domain/space-policy.ts`. La comprobación crítica de reservas se ejecuta dentro de una transacción `SERIALIZABLE` con reintentos para que dos solicitudes concurrentes no puedan saltarse las reglas de solapamiento, cuota o espacio activo.

## Scripts

| Script | Descripción |
| --- | --- |
| `bun run dev` | Servidor de desarrollo. |
| `bun run build` | Genera Prisma y compila la aplicación para producción. |
| `bun run start` | Sirve la compilación de producción. |
| `bun run lint` | Ejecuta ESLint. |
| `bun run typecheck` | Comprueba TypeScript sin emitir archivos. |
| `bun run test` | Ejecuta la suite de Vitest una vez. |
| `bun run test:watch` | Ejecuta Vitest en modo observador. |
| `bun run db:generate` | Genera el cliente de Prisma. |
| `bun run db:migrate` | Aplica las migraciones pendientes con `prisma migrate deploy`. |
| `bun run db:migrate:dev` | Crea o aplica migraciones en desarrollo con `prisma migrate dev`. |
| `bun run db:seed` | Carga el administrador y el catálogo de ejemplo. |
| `bun run db:studio` | Abre Prisma Studio. |

## Pruebas

```bash
bun run test
```

La suite cubre las reglas de duración, horario, anticipación, solapamiento, cuota, cancelación, estado de los espacios y validación de la ruta pública de las imágenes. No necesita una base de datos.

## Docker

### Imagen de producción

La imagen usa Bun y un build multi-stage. Las variables `NEXT_PUBLIC_*` se incorporan al bundle en tiempo de compilación; los secretos se pasan en tiempo de ejecución.

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://tu-dominio.example \
  --build-arg NEXT_PUBLIC_VENUE_TIMEZONE=America/Bogota \
  --build-arg NEXT_PUBLIC_VENUE_CURRENCY=COP \
  -t cospace .

docker run --rm \
  --env-file .env \
  -p 3000:3000 \
  cospace
```

El contenedor escucha en `0.0.0.0:3000`. Si `DATABASE_URL` apunta a un PostgreSQL que corre en el host, usa una dirección accesible desde el contenedor o el flujo de Docker Compose.

### Docker Compose

El archivo `docker-compose.yml` levanta PostgreSQL en el puerto `5433` y la aplicación en el puerto `3000`. La aplicación sobrescribe `DATABASE_URL` para apuntar al servicio `db`, por lo que no es necesario cambiar el archivo `.env` para este flujo.

```bash
cp .env.example .env
docker compose up -d db
docker compose run --rm app bun run db:generate
docker compose run --rm app bun run db:migrate
docker compose run --rm app bun run db:seed
docker compose up --build -d app
```

Para ver los logs:

```bash
docker compose logs -f app
```

Para detener y eliminar los contenedores:

```bash
docker compose down
```

El volumen `cospace-postgres` conserva los datos. Usa `docker compose down -v` solo si quieres borrar la base local.

## Despliegue

### Supabase

1. Crea un proyecto en Supabase.
2. Copia la cadena de conexión del Session pooler desde `Project settings > Database`.
3. Configura `DATABASE_URL` con esa cadena.
4. Ejecuta las migraciones y el seed desde un entorno con acceso a la base:

   ```bash
   DATABASE_URL="postgresql://..." bun run db:migrate
   DATABASE_URL="postgresql://..." bun run db:seed
   ```

### Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno del proyecto:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ACCESS_TOKEN_EXPIRES_IN`
   - `REFRESH_TOKEN_EXPIRES_IN`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_VENUE_TIMEZONE`
   - `NEXT_PUBLIC_VENUE_CURRENCY`
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - `SEED_ADMIN_NAME`
3. Usa `bun run build` como comando de build.
4. Despliega y actualiza `NEXT_PUBLIC_APP_URL` con la URL final.
5. Ejecuta `bun run db:migrate` contra la base de producción antes de abrir el sitio.

### URL de la aplicación

- Desarrollo local: `http://localhost:3000`
- Producción: pendiente. No hay una URL pública en el repositorio porque el entorno de desarrollo no tiene credenciales de Vercel ni de un proveedor de despliegue. Después de desplegar, reemplaza esta línea con la URL final.

## Estructura del proyecto

```text
app/                    Rutas de Next.js, layouts y route handlers
  [locale]/             Páginas públicas, privadas y de administración
  api/                  Endpoints REST
components/             Componentes de interfaz
  admin/                Formulario y tabla de administración
  booking/              Formulario de reserva
  layout/               Navegación y pie de página
  reservations/         Panel de reservas del usuario
  session/              Contexto de sesión del navegador
  ui/                   Componentes base
i18n/                   Configuración de idiomas y mensajes
lib/                    Utilidades compartidas y contratos de dominio
messages/               Traducciones español/inglés
prisma/                 Esquema, migraciones y seed
server/                 Dominio, servicios, seguridad, HTTP y base de datos
tests/                  Pruebas de reglas de negocio
proxy.ts                Guardia de rutas privadas y enrutado por idioma
Dockerfile              Imagen de producción
docker-compose.yml      PostgreSQL y aplicación para desarrollo local
```

## Seguridad

- Las contraseñas se guardan con bcrypt y nunca se devuelven en las respuestas.
- Los refresh tokens son opacos, se almacenan hasheados y rotan al renovar la sesión.
- Las cookies de autenticación son `httpOnly`, `sameSite=lax` y `secure` en producción.
- El proxy protege `/dashboard` y `/admin`; el backend vuelve a comprobar la sesión y el rol en cada endpoint.
- Los endpoints de autenticación tienen límite de intentos.
- Los errores de API usan códigos estables y se traducen en el cliente; los detalles internos solo se escriben en los logs.
- La creación de reservas exige `Idempotency-Key` desde la interfaz y la clave queda ligada al usuario que la creó.

## CI

`.github/workflows/ci.yml` instala dependencias, genera Prisma, aplica migraciones contra un PostgreSQL efímero y ejecuta `typecheck`, `lint`, `test` y `build` en cada push y pull request.

## Licencia

Uso privado. No se incluye una licencia pública.
