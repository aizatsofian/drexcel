import { handle } from '../../cloud/api.mjs';
export async function onRequest(context) {
  return handle(context.request, context.env, context);
}
