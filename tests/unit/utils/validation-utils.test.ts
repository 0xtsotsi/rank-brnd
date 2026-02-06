/**
 * Validation Utilities Unit Tests
 *
 * Tests for:
 * - safeGet: Safe property access from objects
 * - cn: Tailwind CSS class merging
 */

import { describe, it, expect } from 'vitest';
import { safeGet } from '@/lib/utils/schema-validation';
import { cn } from '@/lib/utils';

describe('Validation Utilities', () => {
  describe('safeGet', () => {
    it('should return existing property value', () => {
      const obj = { name: 'Test', value: 42 };
      expect(safeGet(obj, 'name')).toBe('Test');
      expect(safeGet(obj, 'value')).toBe(42);
    });

    it('should return undefined for non-existing property', () => {
      const obj = { name: 'Test' };
      expect(safeGet(obj, 'nonexistent')).toBeUndefined();
    });

    it('should return undefined for null object', () => {
      expect(safeGet(null as any, 'name')).toBeUndefined();
    });

    it('should return undefined for undefined object', () => {
      expect(safeGet(undefined as any, 'name')).toBeUndefined();
    });

    it('should return undefined for non-object', () => {
      expect(safeGet('string' as any, 'name')).toBeUndefined();
      expect(safeGet(123 as any, 'name')).toBeUndefined();
      expect(safeGet(true as any, 'name')).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const obj = { nested: { value: 'deep' } };
      expect(safeGet(obj, 'nested')).toEqual({ value: 'deep' });
    });

    it('should handle arrays', () => {
      const obj = { items: [1, 2, 3] };
      expect(safeGet(obj, 'items')).toEqual([1, 2, 3]);
    });

    it('should handle property with undefined value', () => {
      const obj = { value: undefined };
      expect(safeGet(obj, 'value')).toBeUndefined();
    });

    it('should handle property with null value', () => {
      const obj = { value: null };
      expect(safeGet(obj, 'value')).toBeNull();
    });

    it('should handle empty string property', () => {
      const obj = { value: '' };
      expect(safeGet(obj, 'value')).toBe('');
    });

    it('should handle numeric property names', () => {
      const obj = { 0: 'zero', 1: 'one' } as any;
      expect(safeGet(obj, '0')).toBe('zero');
    });

    it('should handle special characters in property names', () => {
      const obj = { 'data-value': 'test' } as any;
      expect(safeGet(obj, 'data-value')).toBe('test');
    });

    it('should preserve function references', () => {
      const fn = () => 'test';
      const obj = { method: fn };
      expect(safeGet(obj, 'method')).toBe(fn);
    });

    it('should handle prototype chain properties', () => {
      const obj = { name: 'Test' };
      expect(safeGet(obj, 'toString')).toBe(obj.toString);
    });

    it('should work with Object.create', () => {
      const proto = { inherited: 'value' };
      const obj = Object.create(proto);
      obj.own = 'property';

      expect(safeGet(obj, 'own')).toBe('property');
      expect(safeGet(obj, 'inherited')).toBe('value');
    });
  });
});

describe('cn (Tailwind class merging)', () => {
  it('should merge classes correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    expect(cn('px-2', false && 'py-1', 'bg-red')).toBe('px-2 bg-red');
    expect(cn('px-2', true && 'py-1', 'bg-red')).toBe('px-2 py-1 bg-red');
  });

  it('should resolve Tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red', 'text-blue')).toBe('text-blue');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn('', '')).toBe('');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1');
    expect(cn('bg-red', ['text-white', 'font-bold'])).toBe(
      'bg-red text-white font-bold'
    );
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ 'px-2': true, 'py-1': false, 'bg-red': true })).toBe(
      'px-2 bg-red'
    );
  });

  it('should filter out falsy values', () => {
    expect(cn('px-2', null, 'py-1', undefined, 'bg-red')).toBe(
      'px-2 py-1 bg-red'
    );
    expect(cn('px-2', '', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle complex scenarios', () => {
    const isActive = true;
    const isDisabled = false;
    expect(
      cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class',
        ['array-class'],
        { 'object-class': true }
      )
    ).toBe('base-class active-class array-class object-class');
  });

  it('should handle responsive prefixes correctly', () => {
    expect(cn('md:px-2', 'px-4')).toBe('md:px-2 px-4');
  });

  it('should handle hover/active/focus prefixes', () => {
    expect(cn('hover:bg-red', 'hover:bg-blue')).toBe('hover:bg-blue');
  });

  it('should handle arbitrary values', () => {
    expect(cn('top-[10px]', 'top-[20px]')).toBe('top-[20px]');
  });

  it('should trim whitespace', () => {
    expect(cn('  px-2  ', '  py-1  ')).toBe('px-2 py-1');
  });

  it('should handle duplicate classes', () => {
    expect(cn('px-2', 'px-2')).toBe('px-2');
  });

  it('should handle variants pattern', () => {
    const variants = {
      primary: 'bg-blue text-white',
      secondary: 'bg-gray text-black',
    };
    expect(cn(variants.primary, 'rounded')).toBe('bg-blue text-white rounded');
  });

  it('should handle clsx conditional syntax', () => {
    expect(cn('base-class', { conditional: true, 'not-conditional': false }));
  });
});
