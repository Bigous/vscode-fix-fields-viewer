#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { type } from 'os';
import { parseStringPromise } from 'xml2js';

// Caminhos de entrada e saída
const inputPath = './resources/FIX44.xml';
const outputPath = './dist/fix-dictionary.json';

// Função para carregar e otimizar o dicionário FIX
const parseAndOptimize = async () => {
  try {
    debugger; // Add this line to set a breakpoint
    const xmlData = readFileSync(inputPath, 'utf8');

    // Parse do XML para objeto JavaScript
    const result = await parseStringPromise(xmlData);

    // Transformação e otimização do JSON
    const fields = result.fix.fields[0].field.reduce((acc, field) => {
      const values = field.value === undefined ? null : field.value.reduce((acc, value) => {
        acc[value.$.enum] = value.$.description;
        return acc;
      }, {});
      acc[field.$.number] = {
        name: field.$.name,
        type: field.$.type,
        ...(values && { values }) // Only include 'values' if it is not null
      };
      return acc;
    }, {});

    // Salvar o JSON otimizado no arquivo de saída
    writeFileSync(outputPath, JSON.stringify(fields, null, 2), 'utf8');
    console.log('Dicionário FIX convertido e otimizado!');
  } catch (error) {
    console.error('Erro ao processar o dicionário FIX:', error);
    process.exit(1); // Encerra com erro
  }
};

// Executa a função principal
parseAndOptimize();
