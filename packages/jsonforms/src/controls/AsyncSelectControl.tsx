import type { ControlProps } from "@jsonforms/core";
import { and, uiTypeIs, optionIs, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { AsyncSelect, type AsyncSelectProps } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

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
  const appConfig = config as AsyncSelectConfig | undefined;
  const loaderConfig = asyncSelectKey
    ? appConfig?.asyncSelectLoaders?.[asyncSelectKey]
    : undefined;

  if (!loaderConfig) {
    return (
      <FieldWrapper
        label={label}
        description={description}
        errors={`Missing asyncSelectLoaders config for key "${asyncSelectKey ?? "undefined"}"`}
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
