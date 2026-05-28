'use server';

import { createClient } from '@/lib/supabase/server';
import {
  saveAssignments,
  type SaveAssignmentsInput,
  type SaveAssignmentsResult,
} from '@/lib/services/assignmentSave';

export type { SaveAssignmentsInput, SaveAssignmentsResult };
export type { SaveAssignmentMode } from '@/lib/services/assignmentSave';

export async function saveAssignmentsAction(
  input: SaveAssignmentsInput
): Promise<SaveAssignmentsResult> {
  const supabase = await createClient();
  return saveAssignments(supabase, input);
}
