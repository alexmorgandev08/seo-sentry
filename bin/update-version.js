#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { program } from 'commander'

program
  .name('Update plugin version')
  .description('Update the version of the plugin')
  .requiredOption('-v, --version <char>', 'specify the new version')
  .requiredOption('-p, --slug <char>', 'specify the plugin slug')
  .addHelpText(
    'after',
    `

    Example:
      $ node update-version.js --version 1.2.3
      `,
  )
  .parse()

const { version, slug } = program.opts()

await Promise.all([
  updateVersion({
    filePath: `${slug}.php`,
    version,
    regex: /Version:\s*([\d.]+)/,
    replacement: `Version:     ${version}`,
  }),
  updateVersion({
    filePath: 'readme.txt',
    version,
    regex: /Stable tag:\s*([\d.]+)/,
    replacement: `Stable tag: ${version}`,
  }),
  updateVersion({
    filePath: 'package.json',
    version,
    regex: /"version":\s*"([\d.]+)"/,
    replacement: `"version": "${version}"`,
  }),
  updateVersion({
    filePath: 'backend/app/Config.php',
    version,
    regex: /VERSION\s*=\s*'[\d.]+';/,
    replacement: `VERSION = '${version}';`,
  }),
])

async function updateVersion({ filePath, version, regex, replacement }) {
  const filePathResolved = path.resolve(filePath)

  try {
    const data = fs.readFileSync(filePathResolved, 'utf8')
    const updatedData = data.replace(regex, replacement)

    fs.writeFileSync(filePathResolved, updatedData, 'utf8')

    // eslint-disable-next-line no-console
    console.log(`✔️  ${filePath} version updated to ${version}`)
  }
  catch (error) {
    console.error('Error processing the file:', error)
  }
}
