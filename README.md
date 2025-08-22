
# Donaciones para Raúl — Starter

Arquitectura **sin servidor** con React + Vite + Tailwind + Firebase (Auth por enlace mágico + Firestore) y **exportación a PNG**.

## Requisitos
- Node 18+
- Cuenta Firebase y proyecto creado

## Configuración
1. Crea un proyecto en Firebase y habilita Authentication (Email link/Passwordless) y Firestore.
2. Copia tus claves en `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. Instala dependencias y ejecuta:

```bash
npm i
npm run dev
```

## Rutas
- `/login`
- `/c/default` (Tablero)
- `/c/default/lista` (Lista + botón **Descargar PNG**)
- `/c/default/nueva` (Formulario de donación)

> Cambia `default` por el ID real de tu campaña cuando la crees.

## Notas
- La tabla **se exporta como PNG** usando `html-to-image`.
- El tablero es **muy simple**: Total, #, Promedio, y últimas donaciones.
- Las reglas de seguridad de Firestore deben definirse antes de invitar a la familia.
