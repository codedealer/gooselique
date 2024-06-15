import type { ContextMenuCommandDeniedPayload, Events } from '@sapphire/framework';
import { Listener, UserError } from '@sapphire/framework';
import { isPreconditionErrorContext } from '../../../types';
import { handleCommandDenial, handlePreconditionError } from '../../../lib/discordOps';

export class UserEvent extends Listener<typeof Events.ContextMenuCommandDenied> {
  public override async run(
    { context, message: content }: UserError,
    { interaction }: ContextMenuCommandDeniedPayload,
  ) {
    if (isPreconditionErrorContext(context)) {
      return handlePreconditionError(content, context, interaction);
    }

    return handleCommandDenial(content, interaction);
  }
}
