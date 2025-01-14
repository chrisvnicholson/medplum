import { Button, NativeSelect, Textarea, TextInput } from '@mantine/core';
import { globalSchema, IndexedStructureDefinition } from '@medplum/core';
import { Questionnaire, QuestionnaireItem, QuestionnaireItemAnswerOption, Reference } from '@medplum/fhirtypes';
import React, { useEffect, useRef, useState } from 'react';
import { Form } from './Form';
import { useMedplum } from './MedplumProvider';
import { QuestionnaireFormItem } from './QuestionnaireForm';
import { isChoiceQuestion, QuestionnaireItemType } from './QuestionnaireUtils';
import { getValueAndType } from './ResourcePropertyDisplay';
import { ResourcePropertyInput } from './ResourcePropertyInput';
import { useResource } from './useResource';
import { killEvent } from './utils/dom';

import './QuestionnaireBuilder.css';

export interface QuestionnaireBuilderProps {
  questionnaire: Questionnaire | Reference<Questionnaire>;
  onSubmit: (result: Questionnaire) => void;
}

export function QuestionnaireBuilder(props: QuestionnaireBuilderProps): JSX.Element | null {
  const medplum = useMedplum();
  const defaultValue = useResource(props.questionnaire);
  const [schema, setSchema] = useState<IndexedStructureDefinition | undefined>();
  const [value, setValue] = useState<Questionnaire>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [hoverKey, setHoverKey] = useState<string>();

  function handleDocumentMouseOver(): void {
    setHoverKey(undefined);
  }

  function handleDocumentClick(): void {
    setSelectedKey(undefined);
  }

  useEffect(() => {
    medplum.requestSchema('Questionnaire').then(setSchema).catch(console.log);
  }, [medplum]);

  useEffect(() => {
    setValue(ensureQuestionnaireKeys(defaultValue ?? { resourceType: 'Questionnaire' }));
    document.addEventListener('mouseover', handleDocumentMouseOver);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('mouseover', handleDocumentMouseOver);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [defaultValue]);

  if (!schema || !value) {
    return null;
  }

  return (
    <div className="medplum-questionnaire-builder">
      <Form testid="questionnaire-form" onSubmit={() => props.onSubmit(value)}>
        <ItemBuilder
          item={value}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          hoverKey={hoverKey}
          setHoverKey={setHoverKey}
          onChange={setValue}
        />
        <Button type="submit">Save</Button>
      </Form>
    </div>
  );
}

interface ItemBuilderProps<T extends Questionnaire | QuestionnaireItem> {
  item: T;
  selectedKey: string | undefined;
  setSelectedKey: (key: string | undefined) => void;
  hoverKey: string | undefined;
  setHoverKey: (key: string | undefined) => void;
  onChange: (item: T) => void;
  onRemove?: () => void;
}

function ItemBuilder<T extends Questionnaire | QuestionnaireItem>(props: ItemBuilderProps<T>): JSX.Element {
  const resource = props.item as Questionnaire;
  const item = props.item as QuestionnaireItem;
  const isResource = 'resourceType' in props.item;
  const isContainer = isResource || item.type === QuestionnaireItemType.group;
  const linkId = item.linkId ?? '[untitled]';
  const editing = props.selectedKey === props.item.id;
  const hovering = props.hoverKey === props.item.id;

  const itemRef = useRef<T>();
  itemRef.current = props.item;

  function onClick(e: React.SyntheticEvent): void {
    killEvent(e);
    props.setSelectedKey(props.item.id);
  }

  function onHover(e: React.SyntheticEvent): void {
    killEvent(e);
    props.setHoverKey(props.item.id);
  }

  function changeItem(changedItem: QuestionnaireItem): void {
    const curr = itemRef.current as T;
    props.onChange({
      ...curr,
      item: curr.item?.map((i) => (i.id === changedItem.id ? changedItem : i)),
    } as T);
  }

  function addItem(addedItem: QuestionnaireItem): void {
    props.onChange({
      ...props.item,
      item: [...(props.item?.item ?? []), addedItem],
    });
  }

  function removeItem(removedItem: QuestionnaireItem): void {
    props.onChange({
      ...props.item,
      item: props.item?.item?.filter((i) => i !== removedItem),
    });
  }

  function changeProperty(property: string, value: any): void {
    props.onChange({
      ...itemRef.current,
      [property]: value,
    } as T);
  }

  const className = editing ? 'section editing' : hovering ? 'section hovering' : 'section';
  return (
    <div data-testid={item.linkId} className={className} onClick={onClick} onMouseOver={onHover}>
      {editing ? (
        <>
          {isResource && (
            <div>
              <TextInput
                defaultValue={resource.title}
                onChange={(e) => changeProperty('title', e.currentTarget.value)}
              />
            </div>
          )}
          {!isContainer && (
            <div>
              <NativeSelect
                defaultValue={item.type}
                onChange={(e) => changeProperty('type', e.currentTarget.value)}
                data={[
                  { value: 'display', label: 'Display' },
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'decimal', label: 'Decimal' },
                  { value: 'integer', label: 'Integer' },
                  { value: 'date', label: 'Date' },
                  { value: 'dateTime', label: 'Date/Time' },
                  { value: 'time', label: 'Time' },
                  { value: 'string', label: 'String' },
                  { value: 'text', label: 'Text' },
                  { value: 'url', label: 'URL' },
                  { value: 'choice', label: 'Choice' },
                  { value: 'open-choice', label: 'Open Choice' },
                  { value: 'attachment', label: 'Attachment' },
                  { value: 'reference', label: 'Reference' },
                  { value: 'quantity', label: 'Quantity' },
                ]}
              />
            </div>
          )}
          {!isResource && (
            <Textarea
              style={{ width: '95%', height: '100px', minHeight: '100px', margin: '8px 4px 4px 4px' }}
              defaultValue={item.text}
              onChange={(e) => changeProperty('text', e.currentTarget.value)}
            />
          )}
          {isChoiceQuestion(item) && (
            <AnswerBuilder
              options={item.answerOption}
              onChange={(newOptions) => changeProperty('answerOption', newOptions)}
            />
          )}
        </>
      ) : (
        <>
          {resource.title && <h1>{resource.title}</h1>}
          {item.text && <p>{item.text}</p>}
          {!isContainer && <QuestionnaireFormItem item={item} answers={{}} onChange={() => undefined} />}
        </>
      )}
      {item.item &&
        item.item.map((i) => (
          <div key={i.id}>
            <ItemBuilder
              item={i}
              selectedKey={props.selectedKey}
              setSelectedKey={props.setSelectedKey}
              hoverKey={props.hoverKey}
              setHoverKey={props.setHoverKey}
              onChange={changeItem}
              onRemove={() => removeItem(i)}
            />
          </div>
        ))}
      {!isContainer && (
        <div className="top-actions">
          {editing ? (
            <TextInput defaultValue={item.linkId} onChange={(e) => changeProperty('linkId', e.currentTarget.value)} />
          ) : (
            <div>{linkId}</div>
          )}
        </div>
      )}
      <div className="bottom-actions">
        {isContainer && (
          <>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                addItem({
                  id: generateId(),
                  linkId: generateLinkId('q'),
                  type: 'string',
                  text: 'Question',
                } as QuestionnaireItem);
              }}
            >
              Add item
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                addItem({
                  id: generateId(),
                  linkId: generateLinkId('g'),
                  type: 'group',
                  text: 'Group',
                } as QuestionnaireItem);
              }}
            >
              Add group
            </a>
          </>
        )}
        {!isResource && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (props.onRemove) {
                props.onRemove();
              }
            }}
          >
            Remove
          </a>
        )}
      </div>
    </div>
  );
}

interface AnswerBuilderProps {
  options?: QuestionnaireItemAnswerOption[];
  onChange: (newOptions: QuestionnaireItemAnswerOption[]) => void;
}

function AnswerBuilder(props: AnswerBuilderProps): JSX.Element {
  const property = globalSchema.types['QuestionnaireItemAnswerOption'].properties['value[x]'];
  const options = props.options ?? [];
  return (
    <div>
      {options.map((option: QuestionnaireItemAnswerOption) => {
        const [propertyValue, propertyType] = getValueAndType(
          { type: 'QuestionnaireItemAnswerOption', value: option },
          'value'
        );
        return (
          <div
            key={option.id}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '80%',
            }}
          >
            <div>
              <ResourcePropertyInput
                key={option.id}
                name="value[x]"
                property={property}
                defaultPropertyType={propertyType}
                defaultValue={propertyValue}
                onChange={(newValue: any, propName?: string) => {
                  const newOptions = [...options];
                  const index = newOptions.findIndex((o) => o.id === option.id);
                  newOptions[index] = { id: option.id, [propName as string]: newValue };
                  props.onChange(newOptions);
                }}
              />
            </div>
            <div>
              <a
                href="#"
                onClick={(e: React.SyntheticEvent) => {
                  killEvent(e);
                  props.onChange(options.filter((o) => o.id !== option.id));
                }}
              >
                Remove
              </a>
            </div>
          </div>
        );
      })}
      <a
        href="#"
        onClick={(e: React.SyntheticEvent) => {
          killEvent(e);
          props.onChange([
            ...options,
            {
              id: generateId(),
            },
          ]);
        }}
      >
        Add choice
      </a>
    </div>
  );
}

let nextLinkId = 1;
let nextId = 1;

/**
 * Generates a link ID for an item.
 * Link IDs are required properties on QuestionnaireItem objects.
 * @return A unique link ID.
 */
function generateLinkId(prefix: string): string {
  return prefix + nextLinkId++;
}

/**
 * Generates a unique ID.
 * React needs unique IDs for components for rendering performance.
 * All of the important components in the questionnaire builder have id properties for this:
 * Questionnaire, QuestionnaireItem, and QuestionnaireItemAnswerOption.
 * @return A unique key.
 */
function generateId(): string {
  return 'id-' + nextId++;
}

function ensureQuestionnaireKeys(questionnaire: Questionnaire): Questionnaire {
  return {
    ...questionnaire,
    id: questionnaire.id || generateId(),
    item: ensureQuestionnaireItemKeys(questionnaire.item),
  } as Questionnaire;
}

function ensureQuestionnaireItemKeys(items: QuestionnaireItem[] | undefined): QuestionnaireItem[] | undefined {
  if (!items) {
    return undefined;
  }
  items.forEach((item) => {
    if (item.id?.match(/^id-\d+$/)) {
      nextId = Math.max(nextId, parseInt(item.id.substring(3)) + 1);
    }
    if (item.linkId?.match(/^q\d+$/)) {
      nextLinkId = Math.max(nextLinkId, parseInt(item.linkId.substring(1)) + 1);
    }
  });
  return items.map((item) => ({
    ...item,
    id: item.id || generateId(),
    item: ensureQuestionnaireItemKeys(item.item),
    answerOption: ensureQuestionnaireOptionKeys(item.answerOption),
  }));
}

function ensureQuestionnaireOptionKeys(
  options: QuestionnaireItemAnswerOption[] | undefined
): QuestionnaireItemAnswerOption[] | undefined {
  if (!options) {
    return undefined;
  }
  return options.map((option) => ({
    ...option,
    id: option.id || generateId(),
  }));
}
