import React, { useEffect, useState } from 'react';
import { Progress } from 'antd';

export default function Timer({ total, running, onTick, onExpire }) {
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    setRemaining(total);
  }, [total]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        onTick?.(next);
        if (next <= 0) {
          clearInterval(id);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onTick, onExpire]);

  const percent = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
  return <Progress percent={percent} showInfo format={() => `${remaining}s`} />;
}