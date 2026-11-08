import type { Plugin } from 'vite'

export const NAVY_HUE: number
export function rgbToHsl(r: number, g: number, b: number): [number, number, number]
export function hslToRgb(h: number, s: number, l: number): [number, number, number]
export function isPurple(r: number, g: number, b: number): boolean
export function toNavy(r: number, g: number, b: number): [number, number, number]
export function retintPurples(code: string, isCss: boolean): string
export function midnightTheme(): Plugin
