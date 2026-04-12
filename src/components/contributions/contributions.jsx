import { useEffect, useRef, useState } from "react";
import { retrieveContributionData } from "../../utils/contributions";
import './styles/desktop.css'
import './styles/mobile.css'
import { useDispatch, useSelector } from "react-redux";
import { setData, setWeeks } from "../../redux/contributions/contributiosSlice";

function ContributionsBox() {
    const reduxData = useSelector((state) => state.contributions).data
    const [data, setData] = useState(reduxData);

    useEffect(() => {
        const fetchData = async () => {
            if (data == null) {
                try {
                    const result = await retrieveContributionData('rb58853');
                    setData(result);

                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
        };

        fetchData();
    }, []);


    const total = data && data['data']['user']['contributionsCollection']['contributionCalendar']['totalContributions']

    // return <div>
    //     {git_token}
    // </div>
    return (data && <div className="contributions">
        {data && `${total} contributions in the last year`}
        {data && <YearView data={data} />}
    </div>
    );
}

function YearView({ data }) {
    const [currentMonth, setCurrentMonth] = useState('none')
    const dispatch = useDispatch()

    const myContrs = useRef(null);

    const scrollToRight = () => {
        if (myContrs.current) {
            myContrs.current.scrollLeft = myContrs.current.scrollWidth - myContrs.current.clientWidth;
        }
    };

    let weeks = useSelector((state) => state.contributions).weeks

    useEffect(() => {
        dispatch(setData(data))
        scrollToRight();
    }, [data])

    try {
        weeks = data['data']['user']['contributionsCollection']['contributionCalendar']['weeks']
        dispatch(setWeeks(weeks))
    }
    catch {
        return
    }


    const weekViews = weeks.map((week, index) => {
        return <WeekView key={index} week={week} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
    })

    return <div ref={myContrs} className="yearView">
        <div className="contributionsBox">
            {weekViews}
        </div>
    </div>
}



function WeekView({ week, currentMonth, setCurrentMonth }) {
    const daysColumn = week['contributionDays'].map(day => {
        return <DayView day={day} />
    })
    let month = 'j'

    useEffect(() => {
        if (currentMonth != month)
            setCurrentMonth(month)
        if (currentMonth == month)
            month = null

    }, [currentMonth]);

    return <div className="weekView">
        {/* {month != null && <div class="month">{month}</div>} */}
        {daysColumn}
    </div>
}

function DayView({ day }) {
    let opacity = day['contributionCount'] / 12
    if (day['contributionCount'] > 0)
        opacity = Math.max(0.15, opacity)

    return <div className="backgroundSquare">
        <div className="simpleSquare" style={{ opacity: opacity }}>
            <div className="infoDay">
                {/* {day['contributionCount']} */}
            </div>
        </div>
    </div>
}

export default ContributionsBox