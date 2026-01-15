import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = Symbol('PUBLIC_ROUTE');
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
