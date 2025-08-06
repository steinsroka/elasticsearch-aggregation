import * as ES from "@elastic/elasticsearch/lib/api/types";
import { SearchParams } from "./elasticsearch.types";

/****************************************************************
  Generic type helpers - not ES specific
*****************************************************************/
// 유니온 타입을 인터섹션 타입으로 변환 ( { a: string } | { b: number } | { c: boolean } -> { a: string } & { b: number } & { c: boolean } )
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// 상호 배타적인 유니온 타입 생성 ( type X = { a: string; b: number; } | { aa: string; bb: number; }, const xx: X = { a: 'a', b: 1, aa: 'aa' } aa: 'aa' 가 never로 추론되어 사용 불가 )
type ExclusiveUnion<T, U = T> = T extends any
  ? T &
      Partial<Record<Exclude<U extends any ? keyof U : never, keyof T>, never>>
  : never;

// 중첩된 모든 속성을 readonly로 변경
export type DeepReadonly<T extends {}> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 중첩된 모든 속성을 optional로 변경
type DeepPartial<T extends {}> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 타입 재정의
type ReType<Original, New extends { [K in keyof Original]: any }> = Omit<
  Original,
  keyof New
> &
  New;

// 객체의 키를 중첩된 문자열로 변환 ( { a: { b: { c: number } } } -> 'a.b.c' )
// aggs의 키를 추론하는데 사용 'action.keword' 형태 추론
type DotKeys<
  T extends object,
  FilterUnion = any,
  Primitives = Date,
  P extends undefined | string = undefined
> = _DotKeys<T, FilterUnion, Primitives, P, never>;

type _DotKeys<
  T extends object,
  FilterUnion,
  Primitives,
  P extends undefined | string,
  Acc
> = {
  [K in keyof T]: K extends string
    ? P extends undefined
      ? T[K] extends Primitives | number | string | boolean
        ? Acc | (T[K] extends FilterUnion ? K : never)
        : T[K] extends object
        ? _DotKeys<
            T[K],
            FilterUnion,
            Primitives,
            K,
            T[K] extends FilterUnion ? K : never
          >
        : never
      : T[K] extends Primitives | number | string | boolean
      ? Acc | (T[K] extends FilterUnion ? `${P}.${K}` : never)
      : T[K] extends object
      ? _DotKeys<
          T[K],
          FilterUnion,
          Primitives,
          `${P}.${K}`,
          T[K] extends FilterUnion ? `${P}.${K}` : never
        >
      : never
    : never;
}[keyof T];

// DotKey로 만든 경로에서 실제 타입 추출
type UnDot<
  T extends object,
  D extends string
> = D extends `${infer O}.${infer P}`
  ? O extends keyof T
    ? T[O] extends object
      ? UnDot<T[O], P>
      : T[O]
    : never
  : D extends keyof T
  ? T[D]
  : never;

// dot notation 경로들을 사용해서 새로운 객체 타입 생성
type DotPick<T, D> = UnionToIntersection<
  D extends `${infer P}.${infer Q}`
    ? { [I in Extract<P, keyof T>]: DotPick<T[I], Q> }
    : Pick<T, Extract<D, keyof T>>
>;

// readonly 배열을 유니온타입으로 반환 ( const arr = ['a', 'b', 'c'] -> 'a' | 'b' | 'c' )
type CombineConstStrings<A extends Readonly<string[]>> = A extends Readonly<
  [infer I, ...infer J]
>
  ? J extends Readonly<string[]>
    ? I | CombineConstStrings<J>
    : I | J
  : never;

// 타입 제한용
type Primitive = string | number | boolean | Date;

/****************************************************************
    ES v8 Compatible Types
  *****************************************************************/

type MapElasticAggregation<
  Name extends keyof ES.AggregationsAggregationContainer,
  FieldTypeFilter
> = {
  [k in Name]: ES.AggregationsAggregationContainer[Name] extends {
    field: ES.Field;
  }
    ? ES.AggregationsAggregationContainer[Name] & {
        field: DotKeys<Record<string, unknown>, FieldTypeFilter>;
      }
    : ES.AggregationsAggregationContainer[Name] extends { field?: ES.Field }
    ? ES.AggregationsAggregationContainer[Name] & {
        field?: DotKeys<Record<string, unknown>, FieldTypeFilter>;
      }
    : ES.AggregationsAggregationContainer[Name];
};

// v8에서 _source 타입 개선
type TypedFields =
  | Readonly<DotKeys<Record<string, unknown>>>
  | Readonly<DotKeys<Record<string, unknown>>[]>;

type TypedSearchSourceFilter = {
  excludes?: TypedFields;
  exclude?: TypedFields;
  includes?: TypedFields;
  include?: TypedFields;
};

type TypedSearchSourceConfig = boolean | TypedSearchSourceFilter | TypedFields;

// 공식 타입 정의에서 가져온 완전한 집계 분류
type NumericLeafAggregationKeys =
  | "avg"
  | "sum"
  | "min"
  | "max"
  | "stats"
  | "extended_stats"
  | "percentiles"
  | "percentile_ranks"
  | "median_absolute_deviation"
  | "weighted_avg"
  | "boxplot"
  | "t_test"
  | "rate"
  | "moving_avg"
  | "moving_fn"
  | "moving_percentiles"
  | "serial_diff"
  | "derivative"
  | "cumulative_sum"
  | "cumulative_cardinality";

type GenericLeafAggregationKeys =
  | "value_count"
  | "missing"
  | "cardinality"
  | "string_stats";

type LeafAggregationKeys =
  | NumericLeafAggregationKeys
  | GenericLeafAggregationKeys;

type NodeAggregationKeys =
  | "adjacency_matrix"
  | "auto_date_histogram"
  | "children"
  | "composite"
  | "date_histogram"
  | "date_range"
  | "diversified_sampler"
  | "filter"
  | "filters"
  | "frequent_item_sets"
  | "geo_distance"
  | "geohash_grid"
  | "geotile_grid"
  | "geohex_grid"
  | "global"
  | "histogram"
  | "ip_range"
  | "ip_prefix"
  | "multi_terms"
  | "nested"
  | "parent"
  | "range"
  | "rare_terms"
  | "reverse_nested"
  | "random_sampler"
  | "sampler"
  | "significant_terms"
  | "significant_text"
  | "terms"
  | "time_series"
  | "variable_width_histogram";

// Pipeline aggregations (다른 집계의 결과를 입력으로 받는 집계들)
type PipelineAggregationKeys =
  | "avg_bucket"
  | "max_bucket"
  | "min_bucket"
  | "sum_bucket"
  | "stats_bucket"
  | "extended_stats_bucket"
  | "percentiles_bucket"
  | "bucket_script"
  | "bucket_selector"
  | "bucket_sort"
  | "bucket_count_ks_test"
  | "bucket_correlation"
  | "normalize";

// 특별한 집계들
type SpecialAggregationKeys =
  | "top_hits"
  | "scripted_metric"
  | "inference"
  | "geo_bounds"
  | "geo_centroid"
  | "geo_line"
  | "matrix_stats"
  | "top_metrics"
  | "categorize_text";

// v8의 집계 타입 정의
export type TypedFieldAggregations = {
  // Numeric leaf aggregations
  [AggKey in NumericLeafAggregationKeys]: MapElasticAggregation<AggKey, number>;
} & {
  // Generic leaf aggregations
  [AggKey in GenericLeafAggregationKeys]: MapElasticAggregation<AggKey, any>;
} & {
  // Node aggregations (bucket aggregations that can have sub-aggregations)
  [AggKey in NodeAggregationKeys]: MapElasticAggregation<AggKey, Primitive> &
    OptionalNestedAggregations;
} & {
  // Pipeline aggregations
  [AggKey in PipelineAggregationKeys]: ES.AggregationsAggregationContainer[AggKey] &
    OptionalNestedAggregations;
} & {
  // Special aggregations with custom typing
  top_hits: {
    top_hits: ReType<
      ES.AggregationsTopHitsAggregation,
      {
        _source?: TypedSearchSourceConfig;
      }
    >;
  };
  scripted_metric: {
    scripted_metric: ES.AggregationsScriptedMetricAggregation & {
      resultDoc?: any; // 타입 추론을 위한 필드
    };
  };
  inference: {
    inference: ES.AggregationsInferenceAggregation;
  };
  geo_bounds: {
    geo_bounds: ES.AggregationsGeoBoundsAggregation;
  };
  geo_centroid: {
    geo_centroid: ES.AggregationsGeoCentroidAggregation;
  };
  geo_line: {
    geo_line: ES.AggregationsGeoLineAggregation;
  };
  matrix_stats: {
    matrix_stats: ES.AggregationsMatrixStatsAggregation;
  };
  top_metrics: {
    top_metrics: ES.AggregationsTopMetricsAggregation;
  };
  categorize_text: {
    categorize_text: ES.AggregationsCategorizeTextAggregation;
  };
  bucket_script: {
    bucket_script: ES.AggregationsBucketScriptAggregation;
  };
  bucket_selector: {
    bucket_selector: ES.AggregationsBucketSelectorAggregation;
  };
  bucket_sort: {
    bucket_sort: ES.AggregationsBucketSortAggregation;
  };
};

export interface OptionalNestedAggregations {
  aggs?: NamedAggregations;
}

export type NamedAggregations = DeepReadonly<{
  [aggregationName: string]: Aggregation;
}>;

type NestedAggregationResult<ThisAgg> =
  ThisAgg extends OptionalNestedAggregations
    ? ThisAgg["aggs"] extends NamedAggregations
      ? { [P in keyof ThisAgg["aggs"]]: AggregationResult<ThisAgg["aggs"][P]> }
      : unknown
    : unknown;

// v8 결과 타입 네임스페이스
declare namespace AggregationResults {
  // Leaf aggregation 결과들
  interface LeafResults {
    // Numeric aggregations
    avg: ES.AggregationsAvgAggregate;
    sum: ES.AggregationsSumAggregate;
    min: ES.AggregationsMinAggregate;
    max: ES.AggregationsMaxAggregate;
    stats: ES.AggregationsStatsAggregate;
    extended_stats: ES.AggregationsExtendedStatsAggregate;
    percentiles: ES.AggregationsTDigestPercentilesAggregate;
    percentile_ranks: ES.AggregationsTDigestPercentileRanksAggregate;
    median_absolute_deviation: ES.AggregationsMedianAbsoluteDeviationAggregate;
    weighted_avg: ES.AggregationsWeightedAvgAggregate;
    boxplot: ES.AggregationsBoxPlotAggregate;
    t_test: ES.AggregationsTTestAggregate;
    rate: ES.AggregationsRateAggregate;

    // Generic aggregations
    value_count: ES.AggregationsValueCountAggregate;
    missing: ES.AggregationsMissingAggregate;
    cardinality: ES.AggregationsCardinalityAggregate;
    string_stats: ES.AggregationsStringStatsAggregate;
  }

  // Pipeline aggregation 결과들
  interface PipelineResults {
    avg_bucket: ES.AggregationsSimpleValueAggregate;
    max_bucket: ES.AggregationsBucketMetricValueAggregate;
    min_bucket: ES.AggregationsBucketMetricValueAggregate;
    sum_bucket: ES.AggregationsSimpleValueAggregate;
    stats_bucket: ES.AggregationsStatsBucketAggregate;
    extended_stats_bucket: ES.AggregationsExtendedStatsBucketAggregate;
    percentiles_bucket: ES.AggregationsPercentilesBucketAggregate;
    bucket_script: ES.AggregationsSimpleValueAggregate;
    bucket_selector: ES.AggregationsAggregateBase;
    bucket_sort: ES.AggregationsAggregateBase;
    bucket_count_ks_test: ES.AggregationsAggregateBase;
    bucket_correlation: ES.AggregationsAggregateBase;
    normalize: ES.AggregationsAggregateBase;
    moving_avg: ES.AggregationsSimpleValueAggregate;
    moving_fn: ES.AggregationsSimpleValueAggregate;
    moving_percentiles: ES.AggregationsPercentilesAggregateBase;
    serial_diff: ES.AggregationsDerivativeAggregate;
    derivative: ES.AggregationsDerivativeAggregate;
    cumulative_sum: ES.AggregationsSimpleValueAggregate;
    cumulative_cardinality: ES.AggregationsCumulativeCardinalityAggregate;
  }

  // Special aggregation 결과들
  interface SpecialResults {
    inference: ES.AggregationsInferenceAggregate;
    geo_bounds: ES.AggregationsGeoBoundsAggregate;
    geo_centroid: ES.AggregationsGeoCentroidAggregate;
    geo_line: ES.AggregationsGeoLineAggregate;
    matrix_stats: ES.AggregationsMatrixStatsAggregate;
    top_metrics: ES.AggregationsTopMetricsAggregate;
    categorize_text: ES.AggregationsMultiBucketAggregateBase<any>; // 실제 타입이 없어서 임시
  }

  // _source 설정에 따른 문서 타입 추론
  type SourceDocFromTypedSourceConfig<
    SourceConfig extends TypedSearchSourceConfig
  > = SourceConfig extends false
    ? {}
    : SourceConfig extends true
    ? Record<string, unknown>
    : SourceConfig extends boolean
    ? Record<string, unknown> | {}
    : SourceConfig extends string
    ? DotPick<Record<string, unknown>, SourceConfig>
    : SourceConfig extends Readonly<string[]>
    ? DotPick<Record<string, unknown>, CombineConstStrings<SourceConfig>>
    : SourceConfig extends TypedSearchSourceFilter
    ? SourceConfig["include"] | SourceConfig["includes"] extends TypedFields
      ? SourceDocFromTypedSourceConfig<
          SourceConfig["include"] | SourceConfig["includes"]
        >
      : DeepPartial<Record<string, unknown>>
    : DeepPartial<Record<string, unknown>>;

  interface TopHitsResult<ThisAgg extends TypedFieldAggregations["top_hits"]> {
    hits: {
      total: ES.SearchTotalHits;
      max_score: number | null;
      hits: Document<
        ThisAgg["top_hits"]["_source"] extends TypedSearchSourceConfig
          ? SourceDocFromTypedSourceConfig<ThisAgg["top_hits"]["_source"]>
          : DeepPartial<Record<string, unknown>>
      >[];
    };
  }

  interface ScriptedMetricResult<Result> {
    value: Result;
  }

  // v8의 bucket 결과 타입들을 활용
  type TermsResult<ThisAgg extends TypedFieldAggregations["terms"]> =
    ES.AggregationsStringTermsAggregate & {
      buckets: Array<
        ES.AggregationsStringTermsBucket &
          NestedAggregationResult<ThisAgg> &
          (ThisAgg extends { terms: { field: infer F } }
            ? F extends string
              ? { key: UnDot<Record<string, unknown>, F> }
              : { key: any }
            : { key: any })
      >;
    };

  type MultiTermsResult<ThisAgg extends TypedFieldAggregations["multi_terms"]> =
    ES.AggregationsMultiTermsAggregate & {
      buckets: Array<
        ES.AggregationsMultiTermsBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type DateHistogramResult<
    ThisAgg extends TypedFieldAggregations["date_histogram"]
  > = ES.AggregationsDateHistogramAggregate & {
    buckets: Array<
      ES.AggregationsDateHistogramBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type AutoDateHistogramResult<
    ThisAgg extends TypedFieldAggregations["auto_date_histogram"]
  > = ES.AggregationsAutoDateHistogramAggregate & {
    buckets: Array<
      ES.AggregationsDateHistogramBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type HistogramResult<ThisAgg extends TypedFieldAggregations["histogram"]> =
    ES.AggregationsHistogramAggregate & {
      buckets: Array<
        ES.AggregationsHistogramBucket &
          NestedAggregationResult<ThisAgg> &
          (ThisAgg extends { histogram: { field: infer F } }
            ? F extends string
              ? { key: UnDot<Record<string, unknown>, F> }
              : { key: number }
            : { key: number })
      >;
    };
  type VariableWidthHistogramResult<
    ThisAgg extends TypedFieldAggregations["variable_width_histogram"]
  > = ES.AggregationsVariableWidthHistogramAggregate & {
    buckets: Array<
      ES.AggregationsVariableWidthHistogramBucket &
        NestedAggregationResult<ThisAgg>
    >;
  };

  type FilterResult<ThisAgg extends TypedFieldAggregations["filter"]> =
    ES.AggregationsFilterAggregate & NestedAggregationResult<ThisAgg>;

  type FiltersResult<ThisAgg extends TypedFieldAggregations["filters"]> =
    ES.AggregationsFiltersAggregate & {
      buckets: ES.AggregationsBuckets<
        ES.AggregationsFiltersBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type RangeResult<ThisAgg extends TypedFieldAggregations["range"]> =
    ES.AggregationsRangeAggregate & {
      buckets: Array<
        ES.AggregationsRangeBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type DateRangeResult<ThisAgg extends TypedFieldAggregations["date_range"]> =
    ES.AggregationsDateRangeAggregate & {
      buckets: Array<
        ES.AggregationsRangeBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type IpRangeResult<ThisAgg extends TypedFieldAggregations["ip_range"]> =
    ES.AggregationsIpRangeAggregate & {
      buckets: Array<
        ES.AggregationsIpRangeBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type IpPrefixResult<ThisAgg extends TypedFieldAggregations["ip_prefix"]> =
    ES.AggregationsIpPrefixAggregate & {
      buckets: Array<
        ES.AggregationsIpPrefixBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type NestedResult<ThisAgg extends TypedFieldAggregations["nested"]> =
    ES.AggregationsNestedAggregate & NestedAggregationResult<ThisAgg>;

  type ReverseNestedResult<
    ThisAgg extends TypedFieldAggregations["reverse_nested"]
  > = ES.AggregationsReverseNestedAggregate & NestedAggregationResult<ThisAgg>;

  type CompositeResult<ThisAgg extends TypedFieldAggregations["composite"]> =
    ES.AggregationsCompositeAggregate & {
      buckets: Array<
        ES.AggregationsCompositeBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type GlobalResult<ThisAgg extends TypedFieldAggregations["global"]> =
    ES.AggregationsGlobalAggregate & NestedAggregationResult<ThisAgg>;

  type SamplerResult<ThisAgg extends TypedFieldAggregations["sampler"]> =
    ES.AggregationsSamplerAggregate & NestedAggregationResult<ThisAgg>;

  type DiversifiedSamplerResult<
    ThisAgg extends TypedFieldAggregations["diversified_sampler"]
  > = ES.AggregationsSamplerAggregate & NestedAggregationResult<ThisAgg>;

  type RandomSamplerResult<
    ThisAgg extends TypedFieldAggregations["random_sampler"]
  > = ES.AggregationsSamplerAggregate & NestedAggregationResult<ThisAgg>;

  type GeoHashGridResult<
    ThisAgg extends TypedFieldAggregations["geohash_grid"]
  > = ES.AggregationsGeoHashGridAggregate & {
    buckets: Array<
      ES.AggregationsGeoHashGridBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type GeoTileGridResult<
    ThisAgg extends TypedFieldAggregations["geotile_grid"]
  > = ES.AggregationsGeoTileGridAggregate & {
    buckets: Array<
      ES.AggregationsGeoTileGridBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type GeoHexGridResult<ThisAgg extends TypedFieldAggregations["geohex_grid"]> =
    ES.AggregationsGeoHexGridAggregate & {
      buckets: Array<
        ES.AggregationsGeoHexGridBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type GeoDistanceResult<
    ThisAgg extends TypedFieldAggregations["geo_distance"]
  > = ES.AggregationsGeoDistanceAggregate & {
    buckets: Array<
      ES.AggregationsRangeBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type AdjacencyMatrixResult<
    ThisAgg extends TypedFieldAggregations["adjacency_matrix"]
  > = ES.AggregationsAdjacencyMatrixAggregate & {
    buckets: Array<
      ES.AggregationsAdjacencyMatrixBucket & NestedAggregationResult<ThisAgg>
    >;
  };

  type RareTermsResult<ThisAgg extends TypedFieldAggregations["rare_terms"]> =
    ES.AggregationsStringRareTermsAggregate & {
      buckets: Array<
        ES.AggregationsStringRareTermsBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type SignificantTermsResult<
    ThisAgg extends TypedFieldAggregations["significant_terms"]
  > = ES.AggregationsSignificantStringTermsAggregate & {
    buckets: Array<
      ES.AggregationsSignificantStringTermsBucket &
        NestedAggregationResult<ThisAgg>
    >;
  };

  type SignificantTextResult<
    ThisAgg extends TypedFieldAggregations["significant_text"]
  > = ES.AggregationsSignificantStringTermsAggregate & {
    buckets: Array<
      ES.AggregationsSignificantStringTermsBucket &
        NestedAggregationResult<ThisAgg>
    >;
  };

  type ChildrenResult<ThisAgg extends TypedFieldAggregations["children"]> =
    ES.AggregationsChildrenAggregate & NestedAggregationResult<ThisAgg>;

  type ParentResult<ThisAgg extends TypedFieldAggregations["parent"]> =
    ES.AggregationsParentAggregate & NestedAggregationResult<ThisAgg>;

  type TimeSeriesResult<ThisAgg extends TypedFieldAggregations["time_series"]> =
    ES.AggregationsTimeSeriesAggregate & {
      buckets: Array<
        ES.AggregationsTimeSeriesBucket & NestedAggregationResult<ThisAgg>
      >;
    };

  type FrequentItemSetsResult<
    ThisAgg extends TypedFieldAggregations["frequent_item_sets"]
  > = ES.AggregationsFrequentItemSetsAggregate & {
    buckets: Array<
      ES.AggregationsFrequentItemSetsBucket & NestedAggregationResult<ThisAgg>
    >;
  };
}

// 완전한 집계 결과 타입 매핑
export type AggregationResult<T> =
  // Leaf aggregations - Numeric
  T extends TypedFieldAggregations["avg"]
    ? AggregationResults.LeafResults["avg"]
    : T extends TypedFieldAggregations["sum"]
    ? AggregationResults.LeafResults["sum"]
    : T extends TypedFieldAggregations["min"]
    ? AggregationResults.LeafResults["min"]
    : T extends TypedFieldAggregations["max"]
    ? AggregationResults.LeafResults["max"]
    : T extends TypedFieldAggregations["stats"]
    ? AggregationResults.LeafResults["stats"]
    : T extends TypedFieldAggregations["extended_stats"]
    ? AggregationResults.LeafResults["extended_stats"]
    : T extends TypedFieldAggregations["percentiles"]
    ? AggregationResults.LeafResults["percentiles"]
    : T extends TypedFieldAggregations["percentile_ranks"]
    ? AggregationResults.LeafResults["percentile_ranks"]
    : T extends TypedFieldAggregations["median_absolute_deviation"]
    ? AggregationResults.LeafResults["median_absolute_deviation"]
    : T extends TypedFieldAggregations["weighted_avg"]
    ? AggregationResults.LeafResults["weighted_avg"]
    : T extends TypedFieldAggregations["boxplot"]
    ? AggregationResults.LeafResults["boxplot"]
    : T extends TypedFieldAggregations["t_test"]
    ? AggregationResults.LeafResults["t_test"]
    : T extends TypedFieldAggregations["rate"]
    ? AggregationResults.LeafResults["rate"]
    : // Leaf aggregations - Generic
    T extends TypedFieldAggregations["value_count"]
    ? AggregationResults.LeafResults["value_count"]
    : T extends TypedFieldAggregations["missing"]
    ? AggregationResults.LeafResults["missing"]
    : T extends TypedFieldAggregations["cardinality"]
    ? AggregationResults.LeafResults["cardinality"]
    : T extends TypedFieldAggregations["string_stats"]
    ? AggregationResults.LeafResults["string_stats"]
    : // Special aggregations
    T extends TypedFieldAggregations["top_hits"]
    ? AggregationResults.TopHitsResult<T>
    : T extends TypedFieldAggregations["scripted_metric"]
    ? T["scripted_metric"]["resultDoc"] extends infer R
      ? AggregationResults.ScriptedMetricResult<R>
      : ES.AggregationsScriptedMetricAggregate
    : T extends TypedFieldAggregations["inference"]
    ? AggregationResults.SpecialResults["inference"]
    : T extends TypedFieldAggregations["geo_bounds"]
    ? AggregationResults.SpecialResults["geo_bounds"]
    : T extends TypedFieldAggregations["geo_centroid"]
    ? AggregationResults.SpecialResults["geo_centroid"]
    : T extends TypedFieldAggregations["geo_line"]
    ? AggregationResults.SpecialResults["geo_line"]
    : T extends TypedFieldAggregations["matrix_stats"]
    ? AggregationResults.SpecialResults["matrix_stats"]
    : T extends TypedFieldAggregations["top_metrics"]
    ? AggregationResults.SpecialResults["top_metrics"]
    : T extends TypedFieldAggregations["categorize_text"]
    ? AggregationResults.SpecialResults["categorize_text"]
    : // Bucket aggregations
    T extends TypedFieldAggregations["terms"]
    ? AggregationResults.TermsResult<T>
    : T extends TypedFieldAggregations["multi_terms"]
    ? AggregationResults.MultiTermsResult<T>
    : T extends TypedFieldAggregations["date_histogram"]
    ? AggregationResults.DateHistogramResult<T>
    : T extends TypedFieldAggregations["auto_date_histogram"]
    ? AggregationResults.AutoDateHistogramResult<T>
    : T extends TypedFieldAggregations["histogram"]
    ? AggregationResults.HistogramResult<T>
    : T extends TypedFieldAggregations["variable_width_histogram"]
    ? AggregationResults.VariableWidthHistogramResult<T>
    : T extends TypedFieldAggregations["filter"]
    ? AggregationResults.FilterResult<T>
    : T extends TypedFieldAggregations["filters"]
    ? AggregationResults.FiltersResult<T>
    : T extends TypedFieldAggregations["range"]
    ? AggregationResults.RangeResult<T>
    : T extends TypedFieldAggregations["date_range"]
    ? AggregationResults.DateRangeResult<T>
    : T extends TypedFieldAggregations["ip_range"]
    ? AggregationResults.IpRangeResult<T>
    : T extends TypedFieldAggregations["ip_prefix"]
    ? AggregationResults.IpPrefixResult<T>
    : T extends TypedFieldAggregations["nested"]
    ? AggregationResults.NestedResult<T>
    : T extends TypedFieldAggregations["reverse_nested"]
    ? AggregationResults.ReverseNestedResult<T>
    : T extends TypedFieldAggregations["composite"]
    ? AggregationResults.CompositeResult<T>
    : T extends TypedFieldAggregations["global"]
    ? AggregationResults.GlobalResult<T>
    : T extends TypedFieldAggregations["sampler"]
    ? AggregationResults.SamplerResult<T>
    : T extends TypedFieldAggregations["diversified_sampler"]
    ? AggregationResults.DiversifiedSamplerResult<T>
    : T extends TypedFieldAggregations["random_sampler"]
    ? AggregationResults.RandomSamplerResult<T>
    : T extends TypedFieldAggregations["geohash_grid"]
    ? AggregationResults.GeoHashGridResult<T>
    : T extends TypedFieldAggregations["geotile_grid"]
    ? AggregationResults.GeoTileGridResult<T>
    : T extends TypedFieldAggregations["geohex_grid"]
    ? AggregationResults.GeoHexGridResult<T>
    : T extends TypedFieldAggregations["geo_distance"]
    ? AggregationResults.GeoDistanceResult<T>
    : T extends TypedFieldAggregations["adjacency_matrix"]
    ? AggregationResults.AdjacencyMatrixResult<T>
    : T extends TypedFieldAggregations["rare_terms"]
    ? AggregationResults.RareTermsResult<T>
    : T extends TypedFieldAggregations["significant_terms"]
    ? AggregationResults.SignificantTermsResult<T>
    : T extends TypedFieldAggregations["significant_text"]
    ? AggregationResults.SignificantTextResult<T>
    : T extends TypedFieldAggregations["children"]
    ? AggregationResults.ChildrenResult<T>
    : T extends TypedFieldAggregations["parent"]
    ? AggregationResults.ParentResult<T>
    : T extends TypedFieldAggregations["time_series"]
    ? AggregationResults.TimeSeriesResult<T>
    : T extends TypedFieldAggregations["frequent_item_sets"]
    ? AggregationResults.FrequentItemSetsResult<T>
    : // Pipeline aggregations
    T extends TypedFieldAggregations["avg_bucket"]
    ? AggregationResults.PipelineResults["avg_bucket"]
    : T extends TypedFieldAggregations["max_bucket"]
    ? AggregationResults.PipelineResults["max_bucket"]
    : T extends TypedFieldAggregations["min_bucket"]
    ? AggregationResults.PipelineResults["min_bucket"]
    : T extends TypedFieldAggregations["sum_bucket"]
    ? AggregationResults.PipelineResults["sum_bucket"]
    : T extends TypedFieldAggregations["stats_bucket"]
    ? AggregationResults.PipelineResults["stats_bucket"]
    : T extends TypedFieldAggregations["extended_stats_bucket"]
    ? AggregationResults.PipelineResults["extended_stats_bucket"]
    : T extends TypedFieldAggregations["percentiles_bucket"]
    ? AggregationResults.PipelineResults["percentiles_bucket"]
    : T extends TypedFieldAggregations["bucket_script"]
    ? AggregationResults.PipelineResults["bucket_script"]
    : T extends TypedFieldAggregations["bucket_selector"]
    ? AggregationResults.PipelineResults["bucket_selector"]
    : T extends TypedFieldAggregations["bucket_sort"]
    ? AggregationResults.PipelineResults["bucket_sort"]
    : T extends TypedFieldAggregations["bucket_count_ks_test"]
    ? AggregationResults.PipelineResults["bucket_count_ks_test"]
    : T extends TypedFieldAggregations["bucket_correlation"]
    ? AggregationResults.PipelineResults["bucket_correlation"]
    : T extends TypedFieldAggregations["normalize"]
    ? AggregationResults.PipelineResults["normalize"]
    : T extends TypedFieldAggregations["moving_avg"]
    ? AggregationResults.PipelineResults["moving_avg"]
    : T extends TypedFieldAggregations["moving_fn"]
    ? AggregationResults.PipelineResults["moving_fn"]
    : T extends TypedFieldAggregations["moving_percentiles"]
    ? AggregationResults.PipelineResults["moving_percentiles"]
    : T extends TypedFieldAggregations["serial_diff"]
    ? AggregationResults.PipelineResults["serial_diff"]
    : T extends TypedFieldAggregations["derivative"]
    ? AggregationResults.PipelineResults["derivative"]
    : T extends TypedFieldAggregations["cumulative_sum"]
    ? AggregationResults.PipelineResults["cumulative_sum"]
    : T extends TypedFieldAggregations["cumulative_cardinality"]
    ? AggregationResults.PipelineResults["cumulative_cardinality"]
    : // Fallback
      never;

export type AggregationResults<A extends NamedAggregations> = {
  [name in keyof A]: AggregationResult<A[name]>;
};

// 모든 가능한 집계 타입의 상호 배타적 유니온
type Aggregation = ExclusiveUnion<
  | TypedFieldAggregations[LeafAggregationKeys]
  | TypedFieldAggregations[NodeAggregationKeys]
  | TypedFieldAggregations[PipelineAggregationKeys]
  | TypedFieldAggregations[SpecialAggregationKeys]
  | TypedFieldAggregations["bucket_script"] // 🔧 이것들만 추가
  | OptionalNestedAggregations
>;

interface Document<Source = {}> {
  _index: string;
  _id: string;
  _source: Source;
  _score?: number;
  fields?: Record<string, any>;
}

// v8 호환 검색 매개변수
export interface TSearchRequest extends Omit<ES.SearchRequest, "aggs"> {
  aggs?: NamedAggregations;
}

export interface TSearchResponse<TDoc, T extends TSearchRequest>
  extends Omit<ES.SearchResponse, "aggregations" | "hits"> {
  aggregations?: T["aggs"] extends NamedAggregations
    ? AggregationResults<T["aggs"]>
    : undefined;
  hits: ES.SearchHitsMetadata<TDoc>;
}

export type TAggregations<T extends TSearchRequest> =
  T["aggs"] extends NamedAggregations
    ? AggregationResults<T["aggs"]>
    : undefined;
