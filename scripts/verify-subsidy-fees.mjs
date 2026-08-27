#!/usr/bin/env node
/** Assert student-fee / subsidy cells stay cited and do not leak into the stack. */

import { readFileSync } from 'node:fs'

const src = JSON.parse(readFileSync('data/schools.json', 'utf8'))
const pub = JSON.parse(readFileSync('public/data/schools.json', 'utf8'))
const tape = JSON.parse(readFileSync('data/tape.json', 'utf8'))
const layers = JSON.parse(readFileSync('public/data/layers.json', 'utf8'))

if (JSON.stringify(src) !== JSON.stringify(pub)) {
  throw new Error('data/schools.json and public/data/schools.json drifted')
}

const STACK = ['mediaConference', 'sponsorships', 'tickets', 'contributions']
const publics = src.schools.filter((s) => !s.private)
const privates = src.schools.filter((s) => s.private)

let filled = 0
for (const s of publics) {
  const cap = s.capacity || {}
  const fees = cap.studentFees
  const inst = cap.institutionalSupport
  if (fees?.value != null || inst?.value != null) {
    filled += 1
    const cell = fees?.value != null ? fees : inst
    if (!cell.source || !cell.url) {
      throw new Error(`${s.id}: booked subsidy cell missing source/url`)
    }
  }
  for (const k of STACK) {
    if (cap[k] && cap.studentFees && cap[k] === cap.studentFees) {
      throw new Error(`${s.id}: studentFees aliased onto a stack field`)
    }
  }
}

for (const s of privates) {
  const cap = s.capacity || {}
  if (cap.studentFees?.value != null || cap.institutionalSupport?.value != null) {
    throw new Error(`${s.id}: private school minted a subsidy dollar`)
  }
}

const osu = src.schools.find((s) => s.id === 'ohio-state')
if (osu.capacity.studentFees.value !== 0 || osu.capacity.institutionalSupport.value !== 0) {
  throw new Error('Ohio State $0/$0 filing missing')
}

const lou = layers.schools.louisville.subsidy
if (lou.feeRate?.value !== 200) {
  throw new Error('Louisville $200/semester feeRate missing')
}

const kinds = new Set(tape.items.map((it) => it.kind))
if (!kinds.has('subsidy') || !kinds.has('student-fee')) {
  throw new Error('tape missing subsidy / student-fee kinds')
}

const pitt = src.schools.find((s) => s.id === 'pittsburgh')
if (pitt.capacity.studentFees?.value != null || pitt.capacity.institutionalSupport?.value != null) {
  throw new Error('Pittsburgh minted a dollar without a filing')
}

if (filled < 40) {
  throw new Error(`expected most publics to have a cited cell, got ${filled}/${publics.length}`)
}

console.log(`verify-subsidy-fees: ${filled}/${publics.length} publics filled, privates empty, Ohio State $0/$0, Louisville feeRate kept`)
