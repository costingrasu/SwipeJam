import { useParams } from 'react-router-dom';

export default function JamSession() {
  const { id } = useParams();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-dough animate-in fade-in duration-500 w-full">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-silver/30 max-w-lg w-full">
        <h1 className="text-4xl font-bold text-jam-purple font-poppins mb-4">Welcome to the Jam!</h1>
        <div className="bg-dough py-4 px-6 rounded-2xl border border-silver/50 inline-block mb-8 mt-2">
            <span className="text-subtle-gray font-semibold text-sm block mb-1">JAM ID</span>
            <span className="font-mono text-dark-roast font-bold text-xl tracking-tight">{id}</span>
        </div>
        
        <p className="mt-4 text-[16px] font-semibold text-crust animate-pulse">
            Session mechanics coming in Phase 4...
        </p>
      </div>
    </div>
  );
}
