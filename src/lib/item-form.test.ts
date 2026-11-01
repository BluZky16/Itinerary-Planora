/// <reference types="jest" />
import { parseItemForm, type ItemFormValues } from './item-form';

const blank: ItemFormValues = {
  type: 'restaurant', title: ' Dinner ', start_time: '', end_time: '',
  place_name: ' Locavore ', from_place: 'ignored', to_place: 'ignored', notes: '', cost: '',
};

test('valid restaurant: trimmed, empty fields null, transport fields cleared', () => {
  expect(parseItemForm(blank)).toEqual({
    input: {
      type: 'restaurant', title: 'Dinner', start_time: null, end_time: null,
      place_name: 'Locavore', from_place: null, to_place: null, notes: null, cost: null,
    },
  });
});

test('transport keeps from/to and drops place', () => {
  const r = parseItemForm({ ...blank, type: 'transport', from_place: 'Jakarta', to_place: 'Bandung' });
  expect(r).toMatchObject({ input: { place_name: null, from_place: 'Jakarta', to_place: 'Bandung' } });
});

test('times and costs', () => {
  expect(parseItemForm({ ...blank, start_time: '09:30', cost: '150,000' })).toMatchObject({
    input: { start_time: '09:30', cost: 150000 },
  });
  expect(parseItemForm({ ...blank, cost: '12.50' })).toMatchObject({ input: { cost: 12.5 } });
  expect(parseItemForm({ ...blank, start_time: '24:00' })).toHaveProperty('errors.start_time');
  expect(parseItemForm({ ...blank, start_time: '9:30' })).toHaveProperty('errors.start_time');
  expect(parseItemForm({ ...blank, cost: '-5' })).toHaveProperty('errors.cost');
  expect(parseItemForm({ ...blank, cost: '1.234' })).toHaveProperty('errors.cost');
});

test('title required', () => {
  expect(parseItemForm({ ...blank, title: ' ' })).toEqual({ errors: { title: 'Title is required.' } });
});
