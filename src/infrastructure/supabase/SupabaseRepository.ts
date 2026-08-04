import { AbstractRepository } from '../repositories/AbstractRepository';
import { createClient } from '../../lib/supabase/server';

export abstract class SupabaseRepository<T> extends AbstractRepository<T> {
  protected async getClient() {
    return await createClient();
  }
}
