import { motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

/**
 * Wrap each routed page with this component for a smooth fade + slide-up
 * transition when navigating between routes.
 *
 * Usage (in App.tsx inside <AnimatePresence mode="wait">):
 *   <Route path="/foo" element={<PageTransition><FooPage /></PageTransition>} />
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
