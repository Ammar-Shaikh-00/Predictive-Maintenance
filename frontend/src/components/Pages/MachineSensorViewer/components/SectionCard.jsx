import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function SectionCard({
  title,
  description,
  children,
  defaultOpen = true,
}) {

  const [open, setOpen] =
    useState(defaultOpen);

  return (

    <div className="space-y-4">

      {/* Header */}
      <div className="relative">

        {/* Horizontal line */}
        <div className="
          absolute
          top-1/2
          left-0
          right-0
          h-px
         bg-slate-200
        
        " />

        {/* Content */}
        <div className="
          relative
          flex
          items-center
          justify-between
          gap-4
        ">

          {/* Left */}
          <div className="
            bg-slate-50
            pr-4
          ">

            <h2 className="
              text-xl
              font-bold
              text-slate-800
            ">
              {title}
            </h2>

            {
              description && (
                <p className="
                  text-sm
                  text-slate-500
                  mt-1
                ">
                  {description}
                </p>
              )
            }

          </div>

          {/* Toggle */}
          <button
            onClick={() =>
              setOpen(!open)
            }
            className="
              relative
              z-10
              flex
              items-center
              justify-center
              w-11
              h-11
              rounded-full
              border
              border-slate-200
              bg-white
              shadow-sm
              hover:shadow-md
              hover:border-blue-300
              hover:bg-blue-50
              transition-all
              duration-200
              group
            "
          >

            {
              open ? (
                <ChevronUp
                  size={20}
                  className="
                    text-slate-600
                    group-hover:text-blue-600
                  "
                />
              ) : (
                <ChevronDown
                  size={20}
                  className="
                    text-slate-600
                    group-hover:text-blue-600
                  "
                />
              )
            }

          </button>

        </div>

      </div>

      {/* Body */}
      <div
        className={`
          transition-all
          duration-300
          ease-in-out
          overflow-hidden

          ${
            open
              ? "max-h-[10000px] opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
      >

        <div className="pt-2 gap-1">
          {children}
        </div>

      </div>

    </div>
  );
}