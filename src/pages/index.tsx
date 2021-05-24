import { useState } from 'react';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import styles from './home.module.scss';
import commonStyles from '../styles/common.module.scss';
import { getPrismicClient } from '../services/prismic';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): React.ReactElement {
  const [nextPage, setNextPage] = useState(postsPagination.next_page ?? '');
  const [results, setResults] = useState(postsPagination.results ?? []);

  const handleNextPage = async (): Promise<void> => {
    const request = await fetch(nextPage)
      .then(res => res.json())
      .then(json => json);

    setNextPage(request.next_page);
    setResults([...results, ...request.results]);
  };

  return (
    <>
      <Head>
        <title>spacetravelling</title>
      </Head>
      <main className={styles.container}>
        {results.map(post => (
          <div className={styles.post} key={post.uid}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div className={commonStyles.icons}>
                  <time className={commonStyles.iconText}>
                    <FiCalendar />
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                  <span className={commonStyles.iconText}>
                    <FiUser />
                    {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          </div>
        ))}

        {nextPage && (
          <button
            onClick={() => handleNextPage()}
            type="button"
            className={styles.carregarMaisPosts}
          >
            Carregar mais posts
          </button>
        )}

        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 20,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(p => ({
    uid: p.uid,
    first_publication_date: p.first_publication_date,
    data: {
      title: p.data.title,
      subtitle: p.data.subtitle,
      author: p.data.author,
    },
  }));

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
      preview: preview ?? false,
    },
  };
};
