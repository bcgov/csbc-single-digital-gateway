import type { ControlProps } from "@jsonforms/core";
import { and, optionIs, rankWith, uiTypeIs } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { AsyncSelect, type AsyncSelectProps } from "@repo/ui";
import { useMemo } from "react";

import { FieldWrapper } from "../util/FieldWrapper.js";
import {
  type AsyncSelectUrlMapping,
  buildUrlAsyncLoader,
} from "./async-select-url-loader.js";

interface AsyncSelectLoaderConfig {
  loadOptions: AsyncSelectProps["loadOptions"];
  resolveValue?: AsyncSelectProps["resolveValue"];
}

interface AsyncSelectConfig {
  asyncSelectLoaders?: Record<string, AsyncSelectLoaderConfig>;
}

function AsyncSelectControlRenderer({
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
  uischema,
  config,
}: ControlProps) {
  const options = uischema.options ?? {};
  const asyncSelectKey = options.asyncSelectKey as string | undefined;
  const asyncSelectUrl = options.asyncSelectUrl as string | undefined;
  const asyncSelectMapping = options.asyncSelectMapping as
    | AsyncSelectUrlMapping
    | undefined;
  const appConfig = config as AsyncSelectConfig | undefined;

  const registryLoader = asyncSelectKey
    ? appConfig?.asyncSelectLoaders?.[asyncSelectKey]
    : undefined;

  const mappingKey = useMemo(
    () => JSON.stringify(asyncSelectMapping ?? {}),
    [asyncSelectMapping],
  );
  const urlLoader = useMemo(() => {
    if (registryLoader) return undefined;
    if (!asyncSelectUrl) return undefined;
    return buildUrlAsyncLoader(asyncSelectUrl, asyncSelectMapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryLoader, asyncSelectUrl, mappingKey]);

  const loaderConfig: AsyncSelectLoaderConfig | undefined =
    registryLoader ?? urlLoader;

  if (!loaderConfig) {
    const hasKey = Boolean(asyncSelectKey);
    const message = hasKey
      ? `Missing asyncSelectLoaders config for key "${asyncSelectKey}"`
      : !asyncSelectUrl
        ? "Configure a data URL or registered loader key for this async select"
        : "Missing async select configuration (asyncSelectUrl or asyncSelectKey)";
    return (
      <FieldWrapper
        label={label}
        description={description}
        errors={message}
        visible={visible}
        required={required}
      >
        <div />
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <AsyncSelect
        value={data as string | string[] | undefined}
        onChange={(val) => handleChange(path, val)}
        loadOptions={loaderConfig.loadOptions}
        resolveValue={loaderConfig.resolveValue}
        isMulti={options.isMulti ?? false}
        placeholder={options.placeholder}
        isClearable={options.isClearable ?? true}
        isDisabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const asyncSelectControlTester = rankWith(
  5,
  and(uiTypeIs("Control"), optionIs("format", "asyncSelect")),
);
export const AsyncSelectControl = withJsonFormsControlProps(
  AsyncSelectControlRenderer,
);
export const asyncSelectControlEntry = {
  tester: asyncSelectControlTester,
  renderer: AsyncSelectControl,
};
