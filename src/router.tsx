import React from 'react';
import {
  Outlet,
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { LandingPage } from './LandingPage';
import { EditorApp } from './EditorApp'; // We will extract EditorApp

// Create a root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Create an index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

// Create an editor route
const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor',
  component: EditorApp,
});

// Create the route tree using your routes
const routeTree = rootRoute.addChildren([indexRoute, editorRoute]);

// Create the router using your route tree
export const router = createRouter({ routeTree });

// Register your router for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
