"use client"

import { useMemo } from "react"

export default function AboutUs() {
  const timelineEvents = useMemo(
    () => [
      {
        month: "September",
        title: "Goa Police Hackathon",
        description: "Problem Statement Announced",
        color: "bg-red-500",
        textColor: "text-red-500",
      },
      {
        month: "November",
        title: "Hackathon Win",
        description: "Secured 1st place",
        color: "bg-orange-500",
        textColor: "text-orange-500",
      },
      {
        month: "February",
        title: "Prototype Built",
        description: "Initial version developed",
        color: "bg-gray-500",
        textColor: "text-gray-500",
      },
      {
        month: "March",
        title: "Testing Phase",
        description: "Tested and improved",
        color: "bg-yellow-500",
        textColor: "text-yellow-600",
      },
      {
        month: "April",
        title: "Deployment",
        description: "Offline In-house deployment",
        color: "bg-green-500",
        textColor: "text-green-500",
      },
      {
        month: "May",
        title: "Launch",
        description: "Officially launched",
        color: "bg-purple-500",
        textColor: "text-purple-500",
      },
    ],
    [],
  )

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      {/* Hero Section */}
      <div className="bg-transparent dark:bg-transparent py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-600 mb-6 tracking-tight">
              About The Project
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-red-600 mx-auto rounded-full shadow"></div>
          </div>

          {/* Inauguration Section */}
          <div className="bg-gray-50/80 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-2xl p-12 mb-12 border border-red-100 dark:border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-wide">
                Inauguration
              </h2>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">Dr. Pramod Sawant</p>
              <p className="text-lg text-gray-600 dark:text-gray-300 font-light italic">(Hon&apos;ble Chief Minister of Goa)</p>
            </div>

            {/* Developed by section */}
            <div className="flex justify-center mb-6">
              <span className="text-red-600 font-bold text-base">Developed by:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="text-gray-700 dark:text-gray-200 text-sm">Rohit Raj</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-200 text-sm">Akshat Gosain</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-200 text-sm">Gaurav Singh</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-200 text-sm">Utkarsh Dwivedi</span>
            </div>

            {/* Collaboration Cards */}
            <div className="flex justify-center mb-4">
              <span className="text-red-600 font-bold text-base">Supported by:</span>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Goa Police Card */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Goa Police</h3>
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-200">
                    Shri Alok Kumar (DGP, Goa Police)
                  </p>
                  <p className="text-gray-700 dark:text-gray-200">
                    Shri Rahul Gupta (SP, Goa Police)
                  </p>
                </div>
              </div>

              {/* BITS Pilani Card */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">BITS Pilani, KK Birla Goa Campus</h3>
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-200">
                    Prof. Suman Kundu (Director)
                  </p>
                  <p className="text-gray-700 dark:text-gray-200">
                    Prof. Hemant Rathore (Faculty Mentor)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Timeline */}
      <div className="py-16 px-4 bg-gray-50 dark:bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">Project Timeline (2024-25)</h2>
          <div className="w-16 h-1 bg-red-500 mx-auto mb-16"></div>

          <div className="relative py-20">
            {/* Main Timeline Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-800 dark:bg-gray-200 transform -translate-y-1/2"></div>

            {/* Timeline Start and End Points */}
            <div className="absolute top-1/2 left-0 w-3 h-3 bg-gray-800 dark:bg-gray-200 rounded-full transform -translate-y-1/2 -translate-x-1"></div>
            <div className="absolute top-1/2 right-0 w-3 h-3 bg-gray-800 dark:bg-gray-200 rounded-full transform -translate-y-1/2 translate-x-1"></div>

            {/* Timeline Items */}
            <div className="flex justify-between items-center relative px-8">
              {timelineEvents.map((event, index) => {
                const isEven = index % 2 === 0
                return (
                  <div
                    key={index}
                    className={
                      `flex flex-col items-center relative opacity-0 translate-y-8 animate-fade-in-up`}
                    style={{
                      animationDelay: `${index * 120}ms`,
                      animationFillMode: 'forwards',
                      animationDuration: '0.7s',
                    }}
                  >
                    {/* Content Above (for even indices) */}
                    {isEven && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-4 w-40">
                        <div className="text-center mb-2">
                          <h4 className={`font-bold ${event.textColor} text-sm mb-1`}>{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-xs">{event.description}</p>
                        </div>
                        {/* Small dot above */}
                        <div className="flex justify-center">
                          <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
                        </div>
                        {/* Vertical connector line */}
                        <div className="w-px h-12 bg-gray-400 dark:bg-gray-600 mx-auto"></div>
                      </div>
                    )}

                    {/* Month Label Above (for odd indices - opposite to text below) */}
                    {!isEven && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-4 w-max">
                        <div className="text-center">
                          <span className={`font-bold ${event.textColor} text-xs md:text-sm`}>{event.month}</span>
                        </div>
                      </div>
                    )}

                    {/* Main Timeline Dot */}
                    <div
                      className={`w-5 h-5 rounded-full ${event.color} border-2 border-white dark:border-gray-900 shadow-lg z-10 relative`}
                    ></div>

                    {/* Month Label Below (for even indices - opposite to text above) */}
                    {isEven && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-4 w-max">
                        <div className="text-center">
                          <span className={`font-bold ${event.textColor} text-xs md:text-sm`}>{event.month}</span>
                        </div>
                      </div>
                    )}

                    {/* Content Below (for odd indices) */}
                    {!isEven && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-4 w-40">
                        {/* Vertical connector line */}
                        <div className="w-px h-12 bg-gray-400 dark:bg-gray-600 mx-auto"></div>
                        {/* Small dot below */}
                        <div className="flex justify-center">
                          <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
                        </div>
                        <div className="text-center mt-2">
                          <h4 className={`font-bold ${event.textColor} text-sm mb-1`}>{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-xs">{event.description}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 