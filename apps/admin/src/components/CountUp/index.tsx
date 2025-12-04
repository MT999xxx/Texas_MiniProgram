import { useEffect, useState, useRef } from 'react';

interface Props {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
}

export default function CountUp({ end, duration = 1500, prefix = '', suffix = '', decimals = 0 }: Props) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

            // Easing function: easeOutExpo
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = Math.floor(easeOutExpo * end);

            if (current !== countRef.current) {
                countRef.current = current;
                setCount(current);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        requestAnimationFrame(animate);

        return () => {
            startTimeRef.current = null;
        };
    }, [end, duration]);

    const formattedValue = decimals > 0
        ? count.toFixed(decimals)
        : count.toLocaleString();

    return (
        <span className="count-up">
            {prefix}{formattedValue}{suffix}
        </span>
    );
}
