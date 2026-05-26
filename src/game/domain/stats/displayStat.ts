export interface DisplayStat
{
    label: string;
    value: string;
}

export interface StatField<TContext>
{
    label: string;
    show: (context: TContext) => boolean;
    format: (context: TContext) => string;
}

export const buildStatRows = <TContext>(
    context: TContext,
    fields: readonly StatField<TContext>[],
): DisplayStat[] =>
    fields
        .filter((field) => field.show(context))
        .map((field) => ({
            label: field.label,
            value: field.format(context),
        }));
