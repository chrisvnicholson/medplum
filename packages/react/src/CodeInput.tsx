import { ElementDefinition, ValueSetExpansionContains } from '@medplum/fhirtypes';
import React, { useState } from 'react';
import { ValueSetAutocomplete } from './ValueSetAutocomplete';

export interface CodeInputProps {
  property: ElementDefinition;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
}

export function CodeInput(props: CodeInputProps): JSX.Element {
  const [value, setValue] = useState<string | undefined>(props.defaultValue);

  function handleChange(newValue: ValueSetExpansionContains): void {
    const newCode = valueSetElementToCode(newValue);
    setValue(newCode);
    if (props.onChange) {
      props.onChange(newCode);
    }
  }

  return (
    <ValueSetAutocomplete
      property={props.property}
      name={props.name}
      placeholder={props.placeholder}
      defaultValue={codeToValueSetElement(value)}
      onChange={handleChange}
    />
  );
}

function codeToValueSetElement(code: string | undefined): ValueSetExpansionContains {
  return { code };
}

function valueSetElementToCode(element: ValueSetExpansionContains): string | undefined {
  return element.code;
}
