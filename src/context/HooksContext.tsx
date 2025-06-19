import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface HooksContextType {
  hooksData: string[];
  isHooksLoading: boolean;
  hooksError: string | null;
}

const HooksContext = createContext<HooksContextType | undefined>(undefined);

interface HooksProviderProps {
  children: ReactNode;
}

export const HooksProvider = ({ children }: HooksProviderProps) => {
  const [hooksData, setHooksData] = useState<string[]>([]);
  // isHooksLoading starts as true, which is correct for initial fetch.
  const [isHooksLoading, setIsHooksLoading] = useState(true);
  // hooksError starts as null, also correct.
  const [hooksError, setHooksError] = useState<string | null>(null);

  console.log('HooksProvider is rendering. isHooksLoading:', isHooksLoading); 
  
  useEffect(() => {
    console.log('useEffect in HooksProvider is running.');
    const fetchHooks = async () => {
      // Remove these. isHooksLoading is already true from useState,
      // and hooksError is already null.
      // setIsHooksLoading(true); // NO! This causes the loop.
      // setHooksError(null);     // NO! This causes the loop.

      try {
        const { data, error } = await supabase.from('content_hooks').select('hooks');

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const fetchedHooks: string[] = data
            .map(record => record.hooks)
            .filter(hook => typeof hook === 'string' && hook.trim().length > 0);
          setHooksData(fetchedHooks);
          setHooksError(null); // Clear any previous errors on success
        } else {
          console.warn('No hooks found in database or data is empty. Using hardcoded hooks as fallback.');
          setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
          setHooksError(null); // Clear any previous errors on fallback
        }
      } catch (err: any) {
        console.error('Error fetching hooks:', err);
        setHooksError(`Failed to load hooks: ${err.message}`);
        // Ensure hardcoded hooks are set even on error, so the app still functions
        setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      } finally {
        setIsHooksLoading(false); // Set to false only once fetch is complete (success or error)
      }
    };

     const hardcodedHooksString = `
        - Want [Target audience goal/desire] This is how [my service/product/community] can help you:
        - What [beneficial outcome] looks like in [specific situation].
        - Looking to [benefit] without [hassle]?
        - The [X] worst [topic] mistakes you can make.
        - I can't believe this [tactic/tip/strategy] actually works!
        - How [person/brand] [action] and how we can do the same!
        - I'm tired of hearing about [trend].
        - What's your biggest challenge with [activity]?
        - How [person/brand] went from [situation] to [results].
        - What are your thoughts on [topic/trend]?
        - [X] strategies to [goal].
        - I [feeling] when I saw the results my clients/customers got from [activity]!
        - Wow! I can't believe the impact my [product, service, etc.] has had on [target audience].
        - [Achievement]. If I could start from scratch, here's what I'd do differently.
        - Don't [take action] until you read this!
        - Don't fall for it - [X] myths about [topic].
        - The [Number] trends that are shaking up the [topic] industry!
        - Here are [X] mistakes I made when [activity].
        - Success story from one of my [niche clients] who [specific goal].
        - [X] reasons why [topic] is [adjective].
        - Tired of [problem]? Try this.
        - I don't believe in [commonly held belief].
        - Don't let anyone tell you [X].
        - Improve your [topic/skill] with one simple tactic
        - Stop [activity]. It doesn't work.
        - I don't think [activity] is worth the effort.
        - If you want to [desired result] try this. (Guaranteed results!)
        - The most underestimated [topic] strategy!
        - [X] things I wish I knew before [activity]:
        - I never expected [result]. Here's the full story.
        - Don't make this [topic] mistake when trying to [outcome].
        - The [adjective] moment I realized [topic/goal].
        - What do you think is the biggest misconception about [topic/trend]?
        - [X] signs that it's time to [take action].
        - The truth behind [topic] - busting the most common myths.
        - The most important skill for [life situation].
        - Don't get fooled - not everything you hear about [topic] is true.
        - [Failure]. Here's what I learned.
        - How I [achieved goal] In [specific time period].
        - Trying to [outcome] in [difficulty]?
        - Top [X] reasons why [topic] is not working for you.
        - You won't believe these [number] statistics about [topic].
        - I guarantee that if you do this, you’ll [desired result].
        - How to make [topic] work for you.
        - [Achievement], here's what I learned about [segment]
        - Don't take my word for it - [insert social proof]. Here's how they did it:
        - [Activity] is overrated.
        - How [activity] is holding you back in [situation].
        - [Statistics]. Here's what this means for your business.
        - They said it couldn't be done, but [insert what was accomplished].
        - What's your best tip for [activity]? I'll start:
        - Special discount offer: Get [name of the product/service] for [discounted price] TODAY!
        - [X] [adjective] Ways To Overcome [issue].
        - The one lesson I learned when [action].
        - Do you think [topic] is [X]? Think again!
        - Hurry! [name of the product/service] sale ends soon!
        - Do you want a [name/topic] template for free?
        - The [X] trends in [topic] that you need to watch out for.
        - Get [name of the product/service] now and be a part of [something special]
        - Make [outcome] happen in [time].
        - I [action/decision] and it changed everything.
        - Top [number] lessons from [person/brand] to [action].
        - I use this [name/topic] template to get [results]
        - [Activity] is way better than [activity].
        - [X] simple ways to [action].
        - What [target audience] MUST consider before [action].
        - Here's why every [target audience] should care about [topic].
        - How to use [resource] for maximum [outcome].
        - [X] [topic] stats that'll blow your mind!
        - What no one tells you about [topic].
        - If you are [target audience] looking to [outcome], this post is for you!
        - The most [adjective] thing that happened when I tried [strategy/tactic].
        - You won't believe what [target audience] are saying about [product, service, etc.]!
        - How to [action] without sacrificing [activity].
        - [X] [topic] mistakes you MUST avoid at all costs!
        - [Customer Review]
        - Try this next time when you [scenario]:
        - How to [skill] like a [expert].
        - How to [outcome] with little to no [resource].
        - Why I stopped [activity].
        - Here's why [topic] isn't working for you.
        - Crazy results my clients/customers got from [activity]:
        - [X] reasons you're not [actioning].
        - So many [target audience] get this wrong… Here’s the truth.
        - [X] Hacks To [outcome].
        - The truth about [trend].
        - The SECRET to [desired outcome].
        - The [topic] Bible: The most important things you need to know.
        - Why [topic] is essential for [target audience].
        - Get [name of the product/service] now and join the thousands of [target audience] who have achieved [result].
        - If you’re serious about [goal], you must do this!
        - Reminder: [opposite of limiting belief].
        - The [Number] BIGGEST trends to look out for in the [topic] industry.
        - [X] signs that you need to [action].
        - Why [topic] is the hottest trend of [year].
        - The Definitive Guide To [topic].
        - I tried [strategy/tactic/approach], and here's what happened.
        - [Number] signs that [topic/trend] is changing rapidly.
        - The Ultimate [topic] Cheat Sheet.
        - How to [outcome] the RIGHT way!
        - The [topic or action] guide that'll [outcome].
        - Did you know that [statistics]?
        - [X] things I wish someone told me about [topic/goal].`;

    fetchHooks();
  }, []); // Empty dependency array: runs only once on mount

  return (
    <HooksContext.Provider value={{ hooksData, isHooksLoading, hooksError }}>
      {children}
    </HooksContext.Provider>
  );
};

export const useHooks = () => {
  const context = useContext(HooksContext);
  if (context === undefined) {
    throw new Error('useHooks must be used within a HooksProvider');
  }
  return context;
};