'use client';

import { useState, useCallback, useEffect } from 'react';
import { Delete, Copy, Trash2, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/* ===== Safe math expression evaluator (shunting-yard, no eval) ===== */

type Token =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'func'; v: string }
  | { t: 'const'; v: string }
  | { t: 'paren'; v: '(' | ')' }
  | { t: 'fact'; v: '!' }
  | { t: 'pct'; v: '%' };

const FUNCS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'cbrt', 'abs', 'exp']);
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.replace(/\s+/g, '');
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      let num = '';
      while (j < s.length && /[0-9.]/.test(s[j])) {
        num += s[j];
        j++;
      }
      // scientific notation e.g. 2e3
      if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
        // only treat as exponent if followed by number/sign+number
        const k = j + 1;
        if (k < s.length && (/[0-9]/.test(s[k]) || ((s[k] === '+' || s[k] === '-') && k + 1 < s.length && /[0-9]/.test(s[k + 1])))) {
          num += s[j];
          j++;
          if (s[j] === '+' || s[j] === '-') {
            num += s[j];
            j++;
          }
          while (j < s.length && /[0-9]/.test(s[j])) {
            num += s[j];
            j++;
          }
        }
      }
      const v = parseFloat(num);
      if (isNaN(v)) throw new Error('رقم غير صالح: ' + num);
      tokens.push({ t: 'num', v });
      i = j;
      continue;
    }
    // letters: function or constant
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      let name = '';
      while (j < s.length && /[a-zA-Zπ]/.test(s[j])) {
        name += s[j];
        j++;
      }
      const lower = name.toLowerCase();
      if (lower === 'π' || lower === 'pi') {
        tokens.push({ t: 'const', v: 'pi' });
        i = j;
        continue;
      }
      if (FUNCS.has(lower)) {
        tokens.push({ t: 'func', v: lower });
        i = j;
        continue;
      }
      if (lower === 'e') {
        tokens.push({ t: 'const', v: 'e' });
        i = j;
        continue;
      }
      throw new Error('دالة غير معروفة: ' + name);
    }
    if (c === '(' || c === ')') {
      tokens.push({ t: 'paren', v: c });
      i++;
      continue;
    }
    if (c === '!') {
      tokens.push({ t: 'fact', v: '!' });
      i++;
      continue;
    }
    if (c === '%') {
      tokens.push({ t: 'pct', v: '%' });
      i++;
      continue;
    }
    if ('+-*/^'.includes(c)) {
      // unary minus: if at start or after operator/open-paren
      if (c === '-' && (tokens.length === 0 ||
        tokens[tokens.length - 1].t === 'op' ||
        (tokens[tokens.length - 1].t === 'paren' && tokens[tokens.length - 1].v === '('))) {
        // emit 0 then minus so it becomes 0 - x
        tokens.push({ t: 'num', v: 0 });
        tokens.push({ t: 'op', v: '-' });
        i++;
        continue;
      }
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '×') { tokens.push({ t: 'op', v: '*' }); i++; continue; }
    if (c === '÷') { tokens.push({ t: 'op', v: '/' }); i++; continue; }
    if (c === '−') { tokens.push({ t: 'op', v: '-' }); i++; continue; }
    throw new Error('رمز غير مدعوم: ' + c);
  }
  return tokens;
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
const RIGHT_ASSOC = new Set(['^']);

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  const expectOperand = (i: number) => {
    if (i === 0) return true;
    const prev = out[out.length - 1] || stack[stack.length - 1];
    if (!prev) return true;
    return prev.t === 'op' || (prev.t === 'paren' && prev.v === '(');
  };
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'num' || tk.t === 'const') out.push(tk);
    else if (tk.t === 'func') stack.push(tk);
    else if (tk.t === 'fact') {
      // postfix, higher than ^
      out.push(tk);
    } else if (tk.t === 'op') {
      // implicit multiplication: number/const/closeparen followed by func/const/openparen
      if ((tk.v === '*' ) && false) { /* noop */ }
      while (
        stack.length &&
        stack[stack.length - 1].t === 'op' &&
        PREC[(stack[stack.length - 1] as { t: 'op'; v: string }).v] >= (RIGHT_ASSOC.has(tk.v) ? PREC[tk.v] + 1 : PREC[tk.v])
      ) {
        out.push(stack.pop()!);
      }
      stack.push(tk);
    } else if (tk.t === 'paren' && tk.v === '(') {
      stack.push(tk);
    } else if (tk.t === 'paren' && tk.v === ')') {
      while (stack.length && !(stack[stack.length - 1].t === 'paren' && stack[stack.length - 1].v === '(')) {
        out.push(stack.pop()!);
      }
      if (!stack.length) throw new Error('قوس غير متطابق');
      stack.pop();
      if (stack.length && stack[stack.length - 1].t === 'func') {
        out.push(stack.pop()!);
      }
    } else if (tk.t === 'pct') {
      out.push(tk);
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.t === 'paren') throw new Error('قوس غير متطابق');
    out.push(top);
  }
  return out;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    // gamma extension for non-integers is overkill; restrict
    if (n < 0) throw new Error('عاملي سالب غير معرف');
    return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n);
  }
  if (n > 170) throw new Error('عاملي كبير جداً');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function evalRPN(rpn: Token[], angleMode: 'deg' | 'rad'): number {
  const st: number[] = [];
  const toRad = (x: number) => (angleMode === 'deg' ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angleMode === 'deg' ? (x * 180) / Math.PI : x);
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(tk.v);
    else if (tk.t === 'const') st.push(CONSTANTS[tk.v]);
    else if (tk.t === 'fact') {
      const a = st.pop();
      if (a === undefined) throw new Error('خطأ في التعبير');
      st.push(factorial(a));
    } else if (tk.t === 'pct') {
      const a = st.pop();
      if (a === undefined) throw new Error('خطأ في التعبير');
      st.push(a / 100);
    } else if (tk.t === 'func') {
      const a = st.pop();
      if (a === undefined) throw new Error('خطأ في التعبير');
      switch (tk.v) {
        case 'sin': st.push(Math.sin(toRad(a))); break;
        case 'cos': st.push(Math.cos(toRad(a))); break;
        case 'tan': st.push(Math.tan(toRad(a))); break;
        case 'asin': st.push(fromRad(Math.asin(a))); break;
        case 'acos': st.push(fromRad(Math.acos(a))); break;
        case 'atan': st.push(fromRad(Math.atan(a))); break;
        case 'log': st.push(Math.log10(a)); break;
        case 'ln': st.push(Math.log(a)); break;
        case 'sqrt': if (a < 0) throw new Error('جذر سالب'); st.push(Math.sqrt(a)); break;
        case 'cbrt': st.push(Math.cbrt(a)); break;
        case 'abs': st.push(Math.abs(a)); break;
        case 'exp': st.push(Math.exp(a)); break;
      }
    } else if (tk.t === 'op') {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('خطأ في التعبير');
      switch (tk.v) {
        case '+': st.push(a + b); break;
        case '-': st.push(a - b); break;
        case '*': st.push(a * b); break;
        case '/': if (b === 0) throw new Error('قسمة على صفر'); st.push(a / b); break;
        case '^': st.push(Math.pow(a, b)); break;
      }
    }
  }
  if (st.length !== 1) throw new Error('تعبير غير مكتمل');
  return st[0];
}

function evaluate(expr: string, angleMode: 'deg' | 'rad', ans: number, mem: number): number {
  // substitute Ans and M tokens
  const replaced = expr
    .replace(/Ans/gi, '(' + ans + ')')
    .replace(/\bM\b/g, '(' + mem + ')');
  const tokens = tokenize(replaced);
  const rpn = toRPN(tokens);
  return evalRPN(rpn, angleMode);
}

function formatResult(n: number): string {
  if (!isFinite(n)) return 'خطأ';
  if (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-6)) {
    return n.toExponential(8).replace(/\.?0+e/, 'e');
  }
  const rounded = Math.round(n * 1e10) / 1e10;
  let s = rounded.toString();
  if (s.length > 14) s = rounded.toPrecision(12).replace(/\.?0+$/, '');
  return s;
}

/* ===== UI ===== */

const BTN_STYLES: Record<string, string> = {
  default: 'bg-card border-border hover:border-primary/40 text-foreground',
  num: 'bg-card border-border hover:border-primary/40 text-foreground text-lg font-semibold',
  func: 'bg-muted border-border hover:border-primary/40 text-primary text-xs font-medium',
  op: 'bg-accent/20 border-accent/40 hover:bg-accent/30 text-accent-foreground font-semibold',
  eq: 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold',
  mem: 'bg-secondary border-border hover:border-primary/40 text-secondary-foreground text-xs',
};

function Btn({
  label,
  onClick,
  variant = 'default',
  className = '',
  wide = false,
}: {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'func' | 'op' | 'eq' | 'mem' | 'num';
  className?: string;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${BTN_STYLES[variant]} ${wide ? 'col-span-2' : ''} rounded-lg border h-12 sm:h-14 flex items-center justify-center transition-all active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

export function ScientificCalculator() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [angle, setAngle] = useState<'deg' | 'rad'>('deg');
  const [mem, setMem] = useState(0);
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const append = useCallback((s: string) => {
    setExpr((e) => e + s);
  }, []);

  const clearAll = () => {
    setExpr('');
    setResult('0');
  };

  const backspace = () => setExpr((e) => e.slice(0, -1));

  const compute = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const r = evaluate(expr, angle, ans, mem);
      const formatted = formatResult(r);
      setResult(formatted);
      setAns(r);
      setHistory((h) => [{ expr, result: formatted }, ...h].slice(0, 30));
    } catch (err) {
      setResult('خطأ: ' + (err as Error).message);
    }
  }, [expr, angle, ans, mem]);

  // keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (/[0-9.+\-*/^%!()]/.test(k)) {
        e.preventDefault();
        append(k);
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        compute();
      } else if (k === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (k === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [append, compute]);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success('تم نسخ النتيجة');
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  const applyHistory = (h: { expr: string; result: string }) => {
    setExpr(h.result);
    setResult(h.result);
    setShowHistory(false);
  };

  return (
    <Card className="p-4 sm:p-5 max-w-2xl mx-auto">
      {/* Display */}
      <div className="bg-background border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAngle((a) => (a === 'deg' ? 'rad' : 'deg'))}
              className="px-2 py-0.5 rounded text-xs font-bold bg-muted"
            >
              {angle.toUpperCase()}
            </button>
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="px-2 py-0.5 rounded text-xs bg-muted hover:bg-muted/70 flex items-center gap-1"
            >
              <History className="size-3.5" /> {history.length}
            </button>
          </div>
          <div className="text-xs text-muted-foreground" dir="ltr">
            M: {formatResult(mem)} | Ans: {formatResult(ans)}
          </div>
        </div>
        <div dir="ltr" className="text-right text-sm text-muted-foreground min-h-[20px] break-all font-mono">
          {expr || ' '}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div dir="ltr" className="text-right text-2xl sm:text-3xl font-bold font-mono break-all flex-1">
            {result}
          </div>
          <button onClick={copyResult} className="p-1.5 rounded hover:bg-muted" aria-label="نسخ">
            <Copy className="size-4" />
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-3 max-h-40 overflow-y-auto scroll-thin border border-border rounded-lg p-2 space-y-1">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => applyHistory(h)}
              className="w-full text-right px-2 py-1 rounded hover:bg-muted text-sm font-mono"
              dir="ltr"
            >
              <span className="text-muted-foreground">{h.expr} = </span>
              <span className="font-bold">{h.result}</span>
            </button>
          ))}
          <button
            onClick={() => setHistory([])}
            className="w-full text-center text-xs text-destructive py-1 flex items-center justify-center gap-1"
          >
            <Trash2 className="size-3" /> مسح السجل
          </button>
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-6 gap-1.5">
        {/* Row 1 - memory + sci */}
        <Btn label="MC" variant="mem" onClick={() => setMem(0)} />
        <Btn label="MR" variant="mem" onClick={() => append(formatResult(mem))} />
        <Btn label="M+" variant="mem" onClick={() => { try { setMem((m) => m + (evaluate(expr, angle, ans, mem) || 0)); } catch {} }} />
        <Btn label="M−" variant="mem" onClick={() => { try { setMem((m) => m - (evaluate(expr, angle, ans, mem) || 0)); } catch {} }} />
        <Btn label="Ans" variant="mem" onClick={() => append('Ans')} />
        <Btn label="π" variant="func" onClick={() => append('π')} />

        {/* Row 2 - sci funcs */}
        <Btn label="sin" variant="func" onClick={() => append('sin(')} />
        <Btn label="cos" variant="func" onClick={() => append('cos(')} />
        <Btn label="tan" variant="func" onClick={() => append('tan(')} />
        <Btn label="log" variant="func" onClick={() => append('log(')} />
        <Btn label="ln" variant="func" onClick={() => append('ln(')} />
        <Btn label="e" variant="func" onClick={() => append('e')} />

        {/* Row 3 */}
        <Btn label="asin" variant="func" onClick={() => append('asin(')} />
        <Btn label="acos" variant="func" onClick={() => append('acos(')} />
        <Btn label="atan" variant="func" onClick={() => append('atan(')} />
        <Btn label="√" variant="func" onClick={() => append('sqrt(')} />
        <Btn label="∛" variant="func" onClick={() => append('cbrt(')} />
        <Btn label="|x|" variant="func" onClick={() => append('abs(')} />

        {/* Row 4 - numbers start */}
        <Btn label="(" variant="op" onClick={() => append('(')} />
        <Btn label=")" variant="op" onClick={() => append(')')} />
        <Btn label="!" variant="op" onClick={() => append('!')} />
        <Btn label="%" variant="op" onClick={() => append('%')} />
        <Btn label="^" variant="op" onClick={() => append('^')} />
        <Btn label="exp" variant="func" onClick={() => append('exp(')} />

        {/* Row 5 */}
        <Btn label="7" variant="num" onClick={() => append('7')} />
        <Btn label="8" variant="num" onClick={() => append('8')} />
        <Btn label="9" variant="num" onClick={() => append('9')} />
        <Btn label="÷" variant="op" onClick={() => append('/')} />
        <Btn label={<Delete className="size-5" />} variant="op" onClick={backspace} />
        <Btn label="AC" variant="op" onClick={clearAll} className="text-destructive" />

        {/* Row 6 */}
        <Btn label="4" variant="num" onClick={() => append('4')} />
        <Btn label="5" variant="num" onClick={() => append('5')} />
        <Btn label="6" variant="num" onClick={() => append('6')} />
        <Btn label="×" variant="op" onClick={() => append('*')} />
        <Btn label="x²" variant="func" onClick={() => append('^2')} />
        <Btn label="x³" variant="func" onClick={() => append('^3')} />

        {/* Row 7 */}
        <Btn label="1" variant="num" onClick={() => append('1')} />
        <Btn label="2" variant="num" onClick={() => append('2')} />
        <Btn label="3" variant="num" onClick={() => append('3')} />
        <Btn label="−" variant="op" onClick={() => append('-')} />
        <Btn label="1/x" variant="func" onClick={() => { try { const v = evaluate(expr, angle, ans, mem); setExpr(formatResult(1 / v)); } catch {} }} />
        <Btn label="±" variant="func" onClick={() => setExpr((e) => e.startsWith('-') ? e.slice(1) : '-' + e)} />

        {/* Row 8 */}
        <Btn label="0" variant="num" onClick={() => append('0')} />
        <Btn label="." variant="num" onClick={() => append('.')} />
        <Btn label="EE" variant="func" onClick={() => append('e')} />
        <Btn label="+" variant="op" onClick={() => append('+')} />
        <Btn label="=" variant="eq" onClick={compute} wide />
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        أدخل التعبير ثم اضغط =. يدعم الأولويات والأقواس والدوال العلمية والذاكرة.
        أزرار لوحة المفاتيح مدعومة (أرقام، +، −، *، /، Enter، Backspace، Esc).
      </p>
    </Card>
  );
}
