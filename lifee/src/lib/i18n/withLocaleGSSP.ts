// src/lib/i18n/withLocaleGSSP.ts
import type {
    GetServerSideProps,
    GetServerSidePropsContext,
    GetServerSidePropsResult,
} from "next";
import type {Locale} from "@/lib/i18n/index";
import {getLocaleFromRequest} from "@/lib/i18n/ssrLocale";

type WithLocaleProps = { locale: Locale };

export function withLocaleGSSP<P extends Record<string, any> = Record<string, any>>(
    inner?: GetServerSideProps<P>
): GetServerSideProps<P & WithLocaleProps> {
    return async (
        ctx: GetServerSidePropsContext
    ): Promise<GetServerSidePropsResult<P & WithLocaleProps>> => {
        const locale = getLocaleFromRequest(ctx);

        if (!inner) {
            return {props: {locale} as P & WithLocaleProps};
        }

        const res = await inner(ctx);

        // Pass-through redirects / notFound
        if ("redirect" in res) return res;
        if ("notFound" in res && res.notFound) return res;

        const props = ("props" in res ? res.props : {}) as P;

        return {
            ...res,
            props: {
                ...(props || ({} as P)),
                locale,
            } as P & WithLocaleProps,
        };
    };
}
