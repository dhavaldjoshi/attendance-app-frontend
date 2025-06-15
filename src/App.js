import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- CONFIGURATION ---
// This URL will be pasted from the Google Apps Script deployment (see setup guide).
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBKzTzWmFNpArAJbEO3Bv7K6OaaeJF3nGRriaGxOYJDrSmFFQW7bXjtvsyJA-VMv1o/exec";
// -------------------

// --- Reusable Helper Components ---
const InputField = ({ id, value, onChange, disabled }) => (
    <input
        type="number"
        id={id}
        value={value}
        onChange={onChange}
        min="0"
        max="99"
        disabled={disabled}
        onInput={(e) => { if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2); }}
        className="w-full p-2 text-center border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-gray-100"
        placeholder="0"
    />
);

const TotalField = ({ label, value }) => (
    <div className="flex flex-col text-center p-2 bg-gray-100 rounded-md">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-lg font-bold text-gray-800">{value}</span>
    </div>
);

const Toast = ({ message, type, onDismiss }) => {
    // FIX: The useEffect hook is now at the top level of the component.
    useEffect(() => {
        // The logic inside the hook is conditional, which is allowed.
        if (message) {
            const timer = setTimeout(onDismiss, 4000);
            return () => clearTimeout(timer);
        }
    }, [message, onDismiss]); // Added message to the dependency array.

    // The early return for rendering nothing is still here and is perfectly fine.
    if (!message) return null;

    const baseClasses = 'fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white transition-opacity duration-300 z-50';
    const typeClasses = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    
    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            {message}
            <button onClick={onDismiss} className="ml-4 font-bold">X</button>
        </div>
    );
};

const LoadingOverlay = ({ text }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="text-lg font-medium text-gray-700">{text}...</span>
        </div>
    </div>
);

// --- Main Application Components ---

const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });

    const handleLogin = async () => {
        if (!username || !password) {
            setToast({ message: 'Username and password are required.', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const url = `${SCRIPT_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok.');
            const result = await response.json();
            if (result.success) {
                onLoginSuccess(result.teacher);
            } else {
                setToast({ message: result.message || 'Invalid credentials.', type: 'error' });
            }
        } catch (error) {
            console.error("Login Error:", error);
            setToast({ message: 'Login failed. Check connection or URL.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <React.Fragment>
            {isLoading && <LoadingOverlay text="Logging in" />}
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: '' })} />
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold text-center text-gray-800">Teacher Login</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., teacher6a" />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="••••••••" />
                        </div>
                    </div>
                    <button onClick={handleLogin} disabled={isLoading} className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 disabled:bg-indigo-300">
                        Login
                    </button>
                </div>
            </div>
        </React.Fragment>
    );
};

const AttendancePage = ({ teacher }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const initialAttendanceState = useMemo(() => ({
        classAttendance: { girls: { SC: '', ST: '', SEBC: '', OTHER: '' }, boys: { SC: '', ST: '', SEBC: '', OTHER: '' } },
        mdmAttendance: { girls: { SC: '', ST: '', SEBC: '', OTHER: '' }, boys: { SC: '', ST: '', SEBC: '', OTHER: '' } },
    }), []);
    const [attendanceData, setAttendanceData] = useState(initialAttendanceState);
    const [isExistingEntry, setIsExistingEntry] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });

    const inputOrder = useMemo(() => [
        'classAttendance-SC-girls', 'classAttendance-SC-boys', 'classAttendance-ST-girls', 'classAttendance-ST-boys', 'classAttendance-SEBC-girls', 'classAttendance-SEBC-boys', 'classAttendance-OTHER-girls', 'classAttendance-OTHER-boys',
        'mdmAttendance-SC-girls', 'mdmAttendance-SC-boys', 'mdmAttendance-ST-girls', 'mdmAttendance-ST-boys', 'mdmAttendance-SEBC-girls', 'mdmAttendance-SEBC-boys', 'mdmAttendance-OTHER-girls', 'mdmAttendance-OTHER-boys',
    ], []);

    const fetchDataForClassAndDate = useCallback(async () => {
        setIsLoading(true);
        try {
            const url = `${SCRIPT_URL}?action=fetchData&class=${teacher.assignedClass}&date=${selectedDate}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok.');
            const result = await response.json();
            if (result.found && result.data) {
                const cleanData = JSON.parse(JSON.stringify(result.data), (key, value) => (value == null ? '' : value));
                setAttendanceData(cleanData);
                setIsExistingEntry(true);
                setToast({ message: 'Existing data loaded.', type: 'success' });
            } else {
                setAttendanceData(initialAttendanceState);
                setIsExistingEntry(false);
                setToast({ message: 'Ready for new entry.', type: 'info' });
            }
        } catch (error) {
            console.error("Fetch Data Error:", error);
            setToast({ message: 'Could not fetch data.', type: 'error' });
            setAttendanceData(initialAttendanceState);
        } finally {
            setIsLoading(false);
        }
    }, [teacher.assignedClass, selectedDate, initialAttendanceState]);

    useEffect(() => { fetchDataForClassAndDate(); }, [fetchDataForClassAndDate]);

    const calculatedTotals = useMemo(() => {
        const calculate = (data) => {
            const totalGirls = Object.values(data.girls).reduce((sum, val) => sum + (Number(val) || 0), 0);
            const totalBoys = Object.values(data.boys).reduce((sum, val) => sum + (Number(val) || 0), 0);
            return { totalGirls, totalBoys, grandTotal: totalGirls + totalBoys };
        };
        return {
            classAttendance: calculate(attendanceData.classAttendance),
            mdmAttendance: calculate(attendanceData.mdmAttendance),
        };
    }, [attendanceData]);

    const handleInputChange = (e, category, subCategory, gender) => {
        const { value, id } = e.target;
        const sanitizedValue = value === '' ? '' : Math.min(99, Math.max(0, parseInt(value, 10)));
        setAttendanceData(prevData => ({
            ...prevData,
            [category]: { ...prevData[category], [gender]: { ...prevData[category][gender], [subCategory]: sanitizedValue } }
        }));
        if (sanitizedValue.toString().length >= 2 || sanitizedValue > 9) {
            const currentIndex = inputOrder.indexOf(id);
            if (currentIndex > -1 && currentIndex < inputOrder.length - 1) {
                document.getElementById(inputOrder[currentIndex + 1])?.focus();
            }
        }
    };
    
    const handleClear = () => {
        setAttendanceData(initialAttendanceState);
        setIsExistingEntry(false);
        setToast({ message: 'Fields cleared.', type: 'success' });
    }

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('action', 'saveData');
            formData.append('payload', JSON.stringify({
                className: teacher.assignedClass,
                date: selectedDate,
                attendanceData: attendanceData
            }));

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Network response was not ok.');
            const result = await response.json();

            if (result.success) {
                setIsExistingEntry(true);
                setToast({ message: `Data saved successfully!`, type: 'success' });
            } else {
                setToast({ message: `Error saving: ${result.error || 'Unknown error'}`, type: 'error' });
            }
        } catch (error) {
            console.error("Submit Error:", error);
            setToast({ message: 'Error sending data. Check network connection.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderCategoryInputs = (label, category) => (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">{label}</h3>
            <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 font-medium text-center mb-2">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm text-gray-500">Girls</span>
                <span className="text-sm text-gray-500">Boys</span>
            </div>
            <div className="space-y-3">
                {['SC', 'ST', 'SEBC', 'OTHER'].map(subCategory => (
                    <div key={subCategory} className="grid grid-cols-3 items-center gap-2 sm:gap-4">
                        <span className="font-semibold text-gray-600 text-sm sm:text-base">{subCategory}</span>
                        <InputField id={`${category}-${subCategory}-girls`} value={attendanceData[category].girls[subCategory]} onChange={(e) => handleInputChange(e, category, subCategory, 'girls')} disabled={isLoading} />
                        <InputField id={`${category}-${subCategory}-boys`} value={attendanceData[category].boys[subCategory]} onChange={(e) => handleInputChange(e, category, subCategory, 'boys')} disabled={isLoading} />
                    </div>
                ))}
            </div>
            <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <TotalField label="Total Girls" value={calculatedTotals[category].totalGirls} />
                    <TotalField label="Total Boys" value={calculatedTotals[category].totalBoys} />
                    <TotalField label="Grand Total" value={calculatedTotals[category].grandTotal} />
                </div>
            </div>
        </div>
    );

    return (
        <React.Fragment>
            {isLoading && <LoadingOverlay text="Working" />}
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: '' })} />
            <div className="min-h-screen bg-gray-100 p-2 sm:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <header className="bg-white shadow rounded-lg p-4 mb-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {teacher.name}!</h1>
                    </header>
                    <main className="space-y-6">
                        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                                <label htmlFor="class-select" className="block text-sm font-medium text-gray-700">Class (Locked)</label>
                                <input type="text" id="class-select-locked" value={teacher.assignedClass} readOnly className="mt-1 block w-full p-2 text-base border-gray-300 bg-gray-200 focus:outline-none sm:text-sm rounded-md"/>
                            </div>
                            <div className="flex-1 w-full">
                                <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700">Date</label>
                                <input type="date" id="date-picker" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={isLoading} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            {renderCategoryInputs('Class Attendance', 'classAttendance')}
                            {renderCategoryInputs('MDM Attendance', 'mdmAttendance')}
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
                            <button onClick={handleClear} disabled={isLoading} className="w-full sm:w-auto py-3 px-8 bg-gray-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 hover:bg-gray-600 disabled:bg-gray-300">
                               Clear All
                            </button>
                            <button onClick={handleSubmit} disabled={isLoading} className={`w-full sm:w-auto py-3 px-8 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 ${isExistingEntry ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-300`}>
                                {isExistingEntry ? 'Update Entry' : 'Submit New Entry'}
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </React.Fragment>
    );
};

export default function App() {
    const [loggedInTeacher, setLoggedInTeacher] = useState(null);
    const handleLoginSuccess = (teacherData) => {
        setLoggedInTeacher(teacherData);
    };
    if (!loggedInTeacher) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }
    return <AttendancePage teacher={loggedInTeacher} />;
};
