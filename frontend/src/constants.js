export const LANGUAGE_OPTIONS = [
    {
        key: 'cpp',
        label: 'C++',
        monacoLanguage: 'cpp',
        judge0LanguageId: 54,
        compilerOptions: '-std=c++17',
        starterCode: `#include <bits/stdc++.h>
using namespace std;

int main() {
        ios::sync_with_stdio(false);
        cin.tie(nullptr);

        return 0;
}`
    },
    {
        key: 'c',
        label: 'C',
        monacoLanguage: 'c',
        judge0LanguageId: 50,
        compilerOptions: '-std=c11',
        starterCode: `#include <stdio.h>

int main(void) {
        return 0;
}`
    },
    {
        key: 'python',
        label: 'Python',
        monacoLanguage: 'python',
        judge0LanguageId: 71,
        compilerOptions: '',
        starterCode: `def main():
        pass


if __name__ == '__main__':
        main()`
    },
    {
        key: 'javascript',
        label: 'JavaScript',
        monacoLanguage: 'javascript',
        judge0LanguageId: 63,
        compilerOptions: '',
        starterCode: `function main() {
    // write your solution here
}

main();`
    },
    {
        key: 'java',
        label: 'Java',
        monacoLanguage: 'java',
        judge0LanguageId: 62,
        compilerOptions: '',
        starterCode: `public class Main {
        public static void main(String[] args) {
        }
}`
    }
];

export const DEFAULT_LANGUAGE_KEY = 'cpp';

export const STARTER_CODE = LANGUAGE_OPTIONS.find((language) => language.key === DEFAULT_LANGUAGE_KEY)?.starterCode || '';

export function getLanguageOption(key) {
    return LANGUAGE_OPTIONS.find((language) => language.key === key) || LANGUAGE_OPTIONS[0];
}

export function formatContestDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  let datePart = dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    datePart = dateStr.split('T')[0];
  } else if (dateStr instanceof Date) {
    const y = dateStr.getUTCFullYear();
    const m = String(dateStr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getUTCDate()).padStart(2, '0');
    datePart = `${y}-${m}-${d}`;
  }
  
  const timePart = timeStr || '00:00:00';
  const isoStr = `${datePart}T${timePart}Z`;
  const dt = new Date(isoStr);

  
  if (isNaN(dt.getTime())) {
    return `${datePart} @ ${timePart}`;
  }
  
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
