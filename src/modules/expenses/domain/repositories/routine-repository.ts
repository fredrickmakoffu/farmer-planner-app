import type { Routine } from "../entities/routine"

export interface RoutineRepository {
  create(routine: Omit<Routine, "id">): Promise<Routine>
  findAll(): Promise<Routine[]>
  findById(id: number): Promise<Routine | undefined>
  update(routine: Routine): Promise<void>
  delete(id: number): Promise<void>
  updateSortOrders(updates: { id: number; sort_order: number }[]): Promise<void>
}

export default RoutineRepository
