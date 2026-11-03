export interface Refer {
    sources?: string[];
    license?: string[];
}
export interface Coordinates {
    lat: string;
    lon: string;
}
export interface Units {
    temp: string;
    wind: string;
    precip: string;
    vis: string;
    pressure: string;
}
export interface LocationItem {
    name: string;
    id: string;
    lat: string;
    lon: string;
    adm2: string;
    adm1: string;
    country: string;
    tz: string;
    utcOffset: string;
    type: string;
    rank: string;
    fxLink: string;
}
export interface CityLookupResponse {
    code: string;
    location?: LocationItem[];
    refer?: Refer;
}
export interface NowResponse {
    updateTime: string;
    fxLink: string;
    now: {
        obsTime: string;
        temp: string;
        feelsLike: string;
        text: string;
        wind360: string;
        windDir: string;
        windScale: string;
        windSpeed: string;
        humidity: string;
        precip: string;
        pressure: string;
        vis: string;
        cloud?: string;
        dew?: string;
    };
}
export interface DailyResponse {
    updateTime: string;
    fxLink: string;
    daily: {
        fxDate: string;
        sunrise?: string;
        sunset?: string;
        moonrise?: string;
        moonset?: string;
        moonPhase: string;
        tempMax: string;
        tempMin: string;
        textDay: string;
        textNight: string;
        wind360Day: string;
        windDirDay: string;
        windScaleDay: string;
        windSpeedDay: string;
        wind360Night: string;
        windDirNight: string;
        windScaleNight: string;
        windSpeedNight: string;
        humidity: string;
        precip: string;
        pressure: string;
        vis: string;
        cloud?: string;
        uvIndex: string;
    }[];
}
export interface HourlyResponse {
    updateTime: string;
    fxLink: string;
    hourly: {
        fxTime: string;
        temp: string;
        text: string;
        wind360: string;
        windDir: string;
        windScale: string;
        windSpeed: string;
        humidity: string;
        pop?: string;
        precip: string;
        pressure: string;
        cloud?: string;
        dew?: string;
    }[];
}
export interface MinutelyResponse {
    updateTime: string;
    fxLink: string;
    summary: string;
    minutely: {
        fxTime: string;
        precip: string;
        type: 'rain' | 'snow';
    }[];
}
interface AirIndex {
    code: string;
    name: string;
    aqi: number;
    aqiDisplay: string;
    level?: string;
    category?: string;
    primaryPollutant?: {
        code?: string;
        name?: string;
        fullName?: string;
    };
    health?: {
        effect?: string;
        advice?: {
            generalPopulation?: string;
            sensitivePopulation?: string;
        };
    };
}
interface AirPollutant {
    code: string;
    name: string;
    fullName: string;
    concentration: {
        value: number;
        unit: string;
    };
}
export interface AirCurrentResponse {
    indexes?: AirIndex[];
    pollutants?: AirPollutant[];
    stations?: {
        id: string;
        name: string;
    }[];
}
export interface AirHourlyResponse {
    hours?: {
        forecastTime: string;
        indexes?: AirIndex[];
        pollutants?: AirPollutant[];
    }[];
}
export interface AirDailyResponse {
    days?: {
        forecastStartTime: string;
        forecastEndTime: string;
        indexes?: AirIndex[];
        pollutants?: AirPollutant[];
    }[];
}
export declare function formatNow(data: NowResponse, units: Units): {
    updateTime: string;
    obsTime: string;
    weather: string;
    temp: string;
    feelsLike: string;
    wind: {
        direction: string;
        degree: string;
        scale: string;
        speed: string;
    };
    humidityPercent: string;
    precip1h: string;
    pressure: string;
    visibility: string;
    cloudPercent: string | undefined;
    dew: string | undefined;
    link: string;
};
export declare function formatDaily(data: DailyResponse, days: string, limit: number, units: Units): {
    returned: number;
    total: number;
    truncated: boolean;
    items: {
        date: string;
        weatherDay: string;
        weatherNight: string;
        tempMax: string;
        tempMin: string;
        windDay: {
            direction: string;
            degree: string;
            scale: string;
            speed: string;
        };
        windNight: {
            direction: string;
            degree: string;
            scale: string;
            speed: string;
        };
        humidityPercent: string;
        precip: string;
        pressure: string;
        visibility: string;
        cloudPercent: string | undefined;
        uvIndex: string;
        sunrise: string | undefined;
        sunset: string | undefined;
        moonrise: string | undefined;
        moonset: string | undefined;
        moonPhase: string;
    }[];
    updateTime: string;
    days: string;
    link: string;
};
export declare function formatHourly(data: HourlyResponse, hours: string, limit: number, units: Units): {
    returned: number;
    total: number;
    truncated: boolean;
    items: {
        time: string;
        weather: string;
        temp: string;
        wind: {
            direction: string;
            degree: string;
            scale: string;
            speed: string;
        };
        humidityPercent: string;
        popPercent: string | undefined;
        precip: string;
        pressure: string;
        cloudPercent: string | undefined;
        dew: string | undefined;
    }[];
    updateTime: string;
    hours: string;
    link: string;
};
export declare function formatMinutely(data: MinutelyResponse, limit: number): {
    returned: number;
    total: number;
    truncated: boolean;
    items: {
        time: string;
        precip: string;
        type: "rain" | "snow";
    }[];
    updateTime: string;
    summary: string;
    link: string;
};
export declare function formatAirCurrent(data: AirCurrentResponse): {
    indexes: {
        code: string;
        name: string;
        aqi: string | number;
        level: string | undefined;
        category: string | undefined;
        primaryPollutant: string | undefined;
        healthEffect: string | undefined;
        advice: {
            generalPopulation?: string;
            sensitivePopulation?: string;
        } | undefined;
    }[] | undefined;
    pollutants: {
        code: string;
        name: string;
        fullName: string;
        concentration: string;
    }[] | undefined;
    stations: {
        id: string;
        name: string;
    }[] | undefined;
};
export declare function formatAirHourly(data: AirHourlyResponse, limit: number): {
    returned: number;
    total: number;
    truncated: boolean;
    items: {
        time: string;
        indexes: {
            code: string;
            name: string;
            aqi: string | number;
            level: string | undefined;
            category: string | undefined;
            primaryPollutant: string | undefined;
            healthEffect: string | undefined;
            advice: {
                generalPopulation?: string;
                sensitivePopulation?: string;
            } | undefined;
        }[] | undefined;
        pollutants: {
            code: string;
            name: string;
            fullName: string;
            concentration: string;
        }[] | undefined;
    }[];
};
export declare function formatAirDaily(data: AirDailyResponse, limit: number): {
    returned: number;
    total: number;
    truncated: boolean;
    items: {
        startTime: string;
        endTime: string;
        indexes: {
            code: string;
            name: string;
            aqi: string | number;
            level: string | undefined;
            category: string | undefined;
            primaryPollutant: string | undefined;
            healthEffect: string | undefined;
            advice: {
                generalPopulation?: string;
                sensitivePopulation?: string;
            } | undefined;
        }[] | undefined;
        pollutants: {
            code: string;
            name: string;
            fullName: string;
            concentration: string;
        }[] | undefined;
    }[];
};
export {};
//# sourceMappingURL=format.d.ts.map