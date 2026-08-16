import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CoinDetail from "./pages/CoinDetail";
import Watchlist from "./pages/Watchlist";
import Signals from "./pages/Signals";
import Bot from "./pages/Bot";
import Feed from "./pages/Feed";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="coin/:id" element={<CoinDetail />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="signals" element={<Signals />} />
        <Route path="bot" element={<Bot />} />
        <Route path="feed" element={<Feed />} />
        <Route
          path="*"
          element={<div className="text-center py-16 text-slate-500">Seite nicht gefunden.</div>}
        />
      </Route>
    </Routes>
  );
}
