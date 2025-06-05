export enum StatusTarefa {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA'
}

export interface Tarefa {
  id?: number;
  description: string;
  priority: number;
  status: StatusTarefa | string;
  responsible: string;
  taskListId?: number;
}

export interface TaskList {
  id: number;
  name: string;
  tasks?: Tarefa[];
}
