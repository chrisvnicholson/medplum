import { Autocomplete, AutocompleteItem, Group, Loader, Text } from '@mantine/core';
import { getDisplayString } from '@medplum/core';
import { Patient, Reference, Resource, ResourceType } from '@medplum/fhirtypes';
import React, { forwardRef, useState } from 'react';
import { useMedplum } from './MedplumProvider';
import { ResourceAvatar } from './ResourceAvatar';
import { useResource } from './useResource';

export interface ResourceInputProps<T extends Resource = Resource> {
  readonly resourceType: ResourceType;
  readonly name: string;
  readonly defaultValue?: T | Reference<T>;
  readonly placeholder?: string;
  readonly loadOnFocus?: boolean;
  readonly onChange?: (value: T | undefined) => void;
}

export function ResourceInput<T extends Resource = Resource>(props: ResourceInputProps<T>): JSX.Element {
  const medplum = useMedplum();
  const defaultValue = useResource(props.defaultValue);
  const [value, setValue] = useState<string>(defaultValue ? getDisplayString(defaultValue) : '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AutocompleteItem[]>([]);

  async function loadValues(input: string): Promise<void> {
    setLoading(true);
    const resources = await medplum.searchResources(
      props.resourceType,
      'name=' + encodeURIComponent(input) + '&_count=10'
    );
    setData(resources.map((resource) => ({ value: getDisplayString(resource), resource })));
    setLoading(false);
  }

  async function handleChange(val: string): Promise<void> {
    setValue(val);
    return loadValues(val);
  }

  function handleSelect(item: AutocompleteItem): void {
    setValue(item.value);
    setData([]);
    if (props.onChange) {
      props.onChange(item.resource);
    }
  }

  return (
    <Autocomplete
      itemComponent={ItemComponent}
      value={value}
      data={data}
      placeholder={props.placeholder}
      onFocus={() => loadValues(value)}
      onChange={handleChange}
      onItemSubmit={handleSelect}
      rightSection={loading ? <Loader size={16} /> : null}
    />
  );
}

const ItemComponent = forwardRef<HTMLDivElement, any>(({ value, resource, ...others }: any, ref) => {
  return (
    <div ref={ref} {...others}>
      <Group noWrap>
        <ResourceAvatar value={resource} />
        <div>
          <Text>{value}</Text>
          <Text size="xs" color="dimmed">
            {(resource as Patient).birthDate}
          </Text>
        </div>
      </Group>
    </div>
  );
});
