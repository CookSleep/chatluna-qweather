import type { Context } from 'cordis';
import { Schema } from '@chatluna/schema';
export declare const name = "chatluna-qweather";
export { usage } from './usage';
declare const QUERY_TYPES: readonly ['weatherNow', 'weatherDaily', 'weatherHourly', 'minutelyPrecipitation', 'airCurrent', 'airHourly', 'airDaily'];
type QueryType = (typeof QUERY_TYPES)[number];
type DailyDays = '3d' | '7d' | '10d' | '15d' | '30d';
type HourlyHours = '24h' | '72h' | '168h';
export interface Config {
    tool: {
        name: string;
        description: string;
    };
    apiHost: string;
    authType: 'apiKey' | 'jwt';
    apiKey: string;
    jwtKeyId: string;
    jwtProjectId: string;
    jwtPrivateKey: string;
    jwtTtlSeconds: number;
    lang: string;
    unit: 'm' | 'i';
    timeoutSeconds: number;
    locationNumber: number;
    defaultQueries: QueryType[];
    defaultDailyDays: DailyDays;
    defaultHourlyHours: HourlyHours;
    defaultDailyLimit: number;
    defaultHourlyLimit: number;
    includeOtherLocations: boolean;
}
export declare const Config: Schema<Config>;
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map