import { QueryState } from '@tanstack/react-query';

// Extender o tipo QueryState para incluir propriedades que podem não estar definidas
declare module '@tanstack/react-query' {
  interface QueryState<TData, TError> {
    isFetching?: boolean;
  }
}
